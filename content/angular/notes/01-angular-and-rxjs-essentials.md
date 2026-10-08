# Angular & RxJS Essentials

Angular is a batteries-included TypeScript framework: components, dependency injection, router, forms, HTTP client and testing tools ship together. Interviews concentrate on **data binding**, **DI**, **RxJS**, **change detection** and **forms**. Modern Angular (v17+) adds standalone components, signals and the new control-flow syntax; know both the classic and modern forms.

---

## 1. Components, templates and binding

```ts
@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h3>{{ user.name }}</h3>                       <!-- interpolation -->
    <img [src]="user.avatar" [alt]="user.name" />   <!-- property binding -->
    <button (click)="select.emit(user)">Pick</button> <!-- event binding -->
    <input [(ngModel)]="note" />                   <!-- two-way binding (FormsModule) -->
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  @Input({ required: true }) user!: User;
  @Output() select = new EventEmitter<User>();
  note = '';
}
```

**NgModules vs standalone:** older apps group declarations in `@NgModule`; standalone components declare their own `imports` and are the recommended default now (`bootstrapApplication(AppComponent, { providers: [...] })`).

### 1.1 Directives

| Kind | Examples |
|---|---|
| Structural (change the DOM layout) | `*ngIf`, `*ngFor` (with `trackBy`), `*ngSwitch`; modern `@if`, `@for (x of xs; track x.id)`, `@switch` |
| Attribute (change appearance/behaviour) | `ngClass`, `ngStyle`, custom `@Directive({ selector: '[appAutofocus]' })` |

### 1.2 Lifecycle hooks

| Hook | When |
|---|---|
| `ngOnChanges` | an `@Input` changed (before `ngOnInit`, then on every change) |
| `ngOnInit` | once, after first inputs are set: fetch data here, not in the constructor |
| `ngAfterViewInit` | view and child views are ready: safe to touch `@ViewChild` |
| `ngOnDestroy` | before removal: unsubscribe, clear timers |

> **Asked as:** "Constructor vs ngOnInit?" · "When is @ViewChild available?" · "What's the difference between structural and attribute directives?"

---

## 2. Services and dependency injection

```ts
@Injectable({ providedIn: 'root' })        // app-wide singleton, tree-shakable
export class UserService {
  private http = inject(HttpClient);       // inject() or constructor injection
  getUsers() { return this.http.get<User[]>('/api/users'); }
}
```

Angular's injector is **hierarchical**: root → route/environment injectors → component injectors. Providing a service in a component's `providers` creates a new instance for that subtree, which is useful for per-feature state. Tokens (`InjectionToken`) inject config values; `useClass`, `useValue`, `useFactory` and `useExisting` control how a dependency is built.

---

## 3. RxJS and observables

An **Observable** is a lazy stream of values over time. Nothing happens until someone subscribes.

- **Cold** observables (HTTP calls, `of`, `interval`) start a new producer per subscriber.
- **Hot** observables (DOM events, Subjects) share one producer; late subscribers miss earlier values.

### 3.1 Operators you must know

| Operator | Purpose |
|---|---|
| `map`, `filter`, `tap` | transform, filter, side effects |
| `debounceTime`, `distinctUntilChanged` | typeahead input handling |
| `switchMap` | cancel the previous inner request when a new value arrives (search, route params) |
| `mergeMap` | run inner observables concurrently (fire-and-forget saves) |
| `concatMap` | queue inner observables in order (sequential writes) |
| `exhaustMap` | ignore new values while busy (login button spam) |
| `combineLatest`, `forkJoin`, `withLatestFrom` | combine streams |
| `catchError`, `retry({ count: 3, delay: 1000 })` | error handling |
| `shareReplay({ bufferSize: 1, refCount: true })` | cache and share a result |

```ts
results$ = this.search.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((q) => this.api.search(q).pipe(catchError(() => of([])))),
);
```

### 3.2 Subjects

| Subject | Behaviour |
|---|---|
| `Subject` | multicast, no initial value, no replay |
| `BehaviorSubject` | needs an initial value; new subscribers get the latest value (simple state stores) |
| `ReplaySubject(n)` | replays the last *n* values to new subscribers |
| `AsyncSubject` | emits only the last value, on completion |

### 3.3 Subscription management

Leaked subscriptions keep components alive and fire handlers after destroy. Prefer, in order: the **`async` pipe** in templates (auto-unsubscribes), `takeUntilDestroyed()` (Angular 16+), or the `takeUntil(this.destroy$)` pattern with a Subject completed in `ngOnDestroy`.

> **Asked as:** "switchMap vs mergeMap vs concatMap vs exhaustMap?" · "Hot vs cold observables?" · "How do you avoid memory leaks with subscriptions?"

---

## 4. Routing

```ts
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users/:id', component: UserComponent, resolve: { user: userResolver } },
  { path: 'admin', canActivate: [authGuard], loadChildren: () => import('./admin/routes') }, // lazy
  { path: '**', redirectTo: '' },
];

export const authGuard: CanActivateFn = () => inject(AuthService).isLoggedIn() || inject(Router).parseUrl('/login');
```

- Guards: `canActivate`, `canActivateChild`, `canDeactivate` (unsaved changes), `canMatch` (replaces `canLoad`), plus resolvers to prefetch data.
- Parameters: `ActivatedRoute.snapshot.paramMap` (one-off) vs `paramMap` observable (when the same component is reused for a different id).
- Child routes render into a nested `<router-outlet>`; preloading strategies (`PreloadAllModules` or custom) warm lazy chunks.

---

## 5. Forms

| | Template-driven | Reactive |
|---|---|---|
| Module | `FormsModule` | `ReactiveFormsModule` |
| Model lives in | the template (`ngModel`) | the component (`FormGroup`, `FormControl`, `FormArray`) |
| Good for | simple forms | complex validation, dynamic fields, unit testing |

```ts
form = this.fb.group({
  email: ['', [Validators.required, Validators.email], [this.emailTakenValidator]], // async validator
  password: ['', [Validators.required, Validators.minLength(8)]],
  phones: this.fb.array([]),                                                       // dynamic fields
});
addPhone() { (this.form.get('phones') as FormArray).push(this.fb.control('')); }
```

Custom validators are functions returning `ValidationErrors | null`; async validators return an Observable or Promise and are ideal for "username taken" checks (debounce them).

---

## 6. Change detection and performance

- **Zone.js** patches async APIs and triggers change detection after every event, timer or XHR. Default strategy checks the whole component tree.
- **OnPush** only re-checks a component when an `@Input` reference changes, an event fires inside it, an `async` pipe emits, or you call `markForCheck()`. Pair it with immutable data.
- **Signals** (`signal`, `computed`, `effect`) give fine-grained reactivity and enable zoneless apps.
- Other wins: `trackBy`/`track` in loops, lazy-loaded routes, `@defer` blocks, pure pipes instead of template method calls, `detach()`/`reattach()` for rare hot spots.

> **Asked as:** "How does Angular change detection work?" · "What does OnPush do and what are its gotchas?" · "What are signals?"

---

## 7. State, HTTP and testing

- **State:** services with `BehaviorSubject` or signals for most apps; **NgRx** (Redux pattern: actions, reducers, effects, selectors) when many features share complex state; component communication via inputs/outputs, shared services, or the router.
- **HttpClient:** typed requests returning observables; **interceptors** add auth headers, retry transient failures, and map errors centrally.

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { Authorization: `Bearer ${inject(AuthService).token()}` } }));
```

- **Testing:** Jasmine + Karma historically (Jest/Vitest are common now); `TestBed.configureTestingModule` sets up DI; use `HttpTestingController` to mock HTTP and spies/fakes for services.

---

## 8. Angular vs React in one table

| | Angular | React |
|---|---|---|
| Type | Full framework | UI library + ecosystem |
| Language | TypeScript-first | JS/TS |
| Reactivity | Zone.js / signals, RxJS | state + re-render, hooks |
| DI | built in | context / libraries |
| Forms, router, HTTP | built in | community libraries |
| Learning curve | steeper, more conventions | smaller core, more choices |
