# Terraform (on Azure)

> "Assist with Infrastructure as Code using Terraform" and an "automation-first and infrastructure-as-code mindset." Expect conceptual questions (state!) and possibly writing or fixing a small `.tf` file.

---

## 1. Concept — declarative IaC and the core loop

You describe **what** should exist. Terraform figures out **how** by comparing three things:

```
 your .tf code (desired)  ──┐
                            ├──► terraform plan ──► diff: + create  ~ update  - destroy  -/+ replace
 state file (last known)  ──┤
                            │
 real Azure (refresh)     ──┘
```

| Command | What it does |
|---|---|
| `terraform init` | Downloads providers and modules, configures the **backend** |
| `terraform fmt -recursive` | Formats code (run in CI with `-check`) |
| `terraform validate` | Syntax and internal consistency (no cloud calls) |
| `terraform plan -out=tfplan` | Computes the diff and saves an exact plan |
| `terraform apply tfplan` | Applies **exactly** that saved plan |
| `terraform destroy` | Deletes everything in state (lab cost control!) |
| `terraform output` | Prints outputs |
| `terraform state list/show` | Inspects state |

**Why IaC matters:** reproducible environments (dev = prod shape), code review for infrastructure changes, audit history in Git, disaster recovery (rebuild from code), and no "snowflake" servers that only one person understands.

---

## 2. Language building blocks

| Block | Purpose | Example |
|---|---|---|
| `terraform {}` | Required versions, providers, backend | See §4 |
| `provider` | Configures an API client | `azurerm` |
| `resource` | Something Terraform **creates and owns** | `azurerm_resource_group` |
| `data` | **Reads** something that already exists (not managed) | `data "azurerm_client_config" "current" {}` |
| `variable` | An input | `var.env` |
| `locals` | Computed values / DRY | `local.name_prefix` |
| `output` | Exposes values (to the CLI, other stacks, CI) | AKS name, ACR login server |
| `module` | A reusable group of resources | `module "network" { source = "../../modules/network" }` |

**Implicit dependencies:** referencing `azurerm_resource_group.this.name` tells Terraform to create the RG first. Use `depends_on` only for hidden dependencies Terraform can't see.

---

## 3. State — THE most-asked Terraform topic

**What:** a JSON mapping of your resource addresses → real resource IDs and attributes. **Why it exists:** Terraform needs it to know what it manages, to compute diffs efficiently, and to track dependencies for deletion order.

| Rule | Reason |
|---|---|
| **Store state remotely** (an Azure Storage blob) | A laptop file = lost state, and no teamwork |
| **Lock it** | Two simultaneous applies corrupt state. The azurerm backend locks with a **blob lease** automatically |
| **Protect it** | State contains **secrets in plaintext** (DB passwords, keys). Restrict access and enable versioning/soft delete |
| **Never edit it by hand** | Use `terraform state mv/rm`, `import` and `moved` blocks |
| **Split it** | One giant state = slow plans and a huge blast radius. Split by environment and layer (network / platform / apps) |

⚠️ **Gotcha — `sensitive = true` doesn't encrypt anything.** It only hides values in CLI output; they're still in state. Newer Terraform has **ephemeral values** (1.10+) and **write-only arguments** (1.11+) that keep secrets *out of state*. Better still: let Azure generate secrets and keep them in Key Vault.

🎯 **Interview:** *"What happens if two engineers run apply at the same time?"* → With a locking backend, the second one fails with a lock error. Without locking, state can be corrupted and resources duplicated. *"The lock is stuck after a crashed pipeline?"* → Confirm nobody is running, then `terraform force-unlock <LOCK_ID>`.

---

## 4. 🧪 Project layout and backend for medilab

```
infra/
├── bootstrap/            # creates the state storage (chicken-and-egg: az CLI script)
│   └── bootstrap.sh
├── modules/
│   ├── network/          # vnet, subnets, nsg
│   └── aks/              # cluster, acr pull role
└── envs/
    ├── dev/
    │   ├── backend.tf
    │   ├── providers.tf
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── terraform.tfvars
    │   └── outputs.tf
    └── prod/             # same files, different tfvars and backend key
```

**Bootstrap** (the state backend can't be managed by the state it hosts):

```bash
#!/usr/bin/env bash
set -euo pipefail
RG=rg-tfstate; SA=sttfstatemedilab$RANDOM; LOC=southeastasia
az group create -n "$RG" -l "$LOC"
az storage account create -n "$SA" -g "$RG" -l "$LOC" \
  --sku Standard_ZRS --min-tls-version TLS1_2 --allow-blob-public-access false
az storage account blob-service-properties update -n "$SA" -g "$RG" \
  --enable-versioning true --enable-delete-retention true --delete-retention-days 14
az storage container create -n tfstate --account-name "$SA" --auth-mode login
echo "storage_account_name = $SA"
```

```hcl
# envs/dev/backend.tf
terraform {
  required_version = "~> 1.15.1"          # >= 1.15.1, < 1.16.0  (see §9)
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"                   # any 4.x, never 5.0
    }
  }
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstatemedilab12345"
    container_name       = "tfstate"
    key                  = "dev/platform.tfstate"
    use_azuread_auth     = true            # Entra ID auth, not storage account keys
  }
}
```

```hcl
# envs/dev/providers.tf
provider "azurerm" {
  features {}
  subscription_id = var.subscription_id   # REQUIRED since azurerm 4.0 (or ARM_SUBSCRIPTION_ID)
}
```

⚠️ **Gotcha (azurerm 4.x):** without `subscription_id`, plan fails with *"`subscription_id` is a required provider property when performing a plan/apply operation."* This is a very likely first stumble in a timed practical.

---

## 5. 🧪 Network module (for_each, NSG)

```hcl
# modules/network/variables.tf
variable "name"                { type = string }
variable "location"            { type = string }
variable "resource_group_name" { type = string }
variable "address_space"       { type = list(string) }
variable "subnets" {
  type = map(object({ address_prefixes = list(string) }))
}
variable "tags" {
  type    = map(string)
  default = {}
}
```

```hcl
# modules/network/main.tf
resource "azurerm_virtual_network" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = var.address_space
  tags                = var.tags
}

resource "azurerm_subnet" "this" {
  for_each             = var.subnets
  name                 = each.key
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = each.value.address_prefixes
}

resource "azurerm_network_security_group" "appgw" {
  name                = "nsg-${var.name}-appgw"
  location            = var.location
  resource_group_name = var.resource_group_name

  security_rule {
    name                       = "allow-https-inbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
  security_rule {
    # Application Gateway v2 requires its infrastructure ports open from the GatewayManager tag
    name                       = "allow-gatewaymanager"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "65200-65535"
    source_address_prefix      = "GatewayManager"
    destination_address_prefix = "*"
  }
  tags = var.tags
}

resource "azurerm_subnet_network_security_group_association" "appgw" {
  subnet_id                 = azurerm_subnet.this["snet-appgw"].id
  network_security_group_id = azurerm_network_security_group.appgw.id
}
```

```hcl
# modules/network/outputs.tf
output "vnet_id"    { value = azurerm_virtual_network.this.id }
output "subnet_ids" { value = { for k, s in azurerm_subnet.this : k => s.id } }
```

---

## 6. 🧪 Environment root: RG, network, ACR, Log Analytics, AKS, AcrPull

```hcl
# envs/dev/main.tf
locals {
  env  = "dev"
  tags = { project = "medilab", env = local.env, owner = "platform", managed_by = "terraform" }
}

resource "azurerm_resource_group" "this" {
  name     = "rg-medilab-${local.env}"
  location = var.location
  tags     = local.tags
}

module "network" {
  source              = "../../modules/network"
  name                = "vnet-medilab-${local.env}"
  location            = var.location
  resource_group_name = azurerm_resource_group.this.name
  address_space       = ["10.10.0.0/16"]
  subnets = {
    "snet-aks-nodes"   = { address_prefixes = ["10.10.0.0/22"] }
    "snet-appgw"       = { address_prefixes = ["10.10.8.0/24"] }
    "snet-private-ep"  = { address_prefixes = ["10.10.9.0/24"] }
  }
  tags = local.tags
}

resource "azurerm_container_registry" "this" {
  name                = "medilabacr${local.env}"   # globally unique, alphanumeric only
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  sku                 = "Basic"
  admin_enabled       = false                        # never use the admin user; use RBAC
  tags                = local.tags
}

resource "azurerm_log_analytics_workspace" "this" {
  name                = "log-medilab-${local.env}"
  location            = var.location
  resource_group_name = azurerm_resource_group.this.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

resource "azurerm_kubernetes_cluster" "this" {
  name                = "aks-medilab-${local.env}"
  location            = var.location
  resource_group_name = azurerm_resource_group.this.name
  dns_prefix          = "medilab-${local.env}"

  default_node_pool {
    name                        = "system"
    vm_size                     = var.node_vm_size      # e.g. "Standard_D2s_v5"
    node_count                  = 2
    vnet_subnet_id              = module.network.subnet_ids["snet-aks-nodes"]
    temporary_name_for_rotation = "systemtmp"            # lets Terraform change vm_size without destroying the cluster
  }

  identity { type = "SystemAssigned" }

  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"          # pod IPs from pod_cidr, not the VNet
    pod_cidr            = "192.168.0.0/16"
    # service_cidr defaults to 10.0.0.0/16 — must NOT overlap the VNet (ours is 10.10.0.0/16)
  }

  oidc_issuer_enabled       = true           # needed for Workload Identity
  workload_identity_enabled = true

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id   # Container Insights
  }

  tags = local.tags
}

# Let AKS nodes pull from ACR — no image pull secrets needed
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.this.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.this.kubelet_identity[0].object_id
}
```

```hcl
# envs/dev/variables.tf
variable "subscription_id" { type = string }
variable "location" {
  type    = string
  default = "southeastasia"
}
variable "node_vm_size" {
  type    = string
  default = "Standard_D2s_v5"
  validation {
    condition     = can(regex("^Standard_", var.node_vm_size))
    error_message = "node_vm_size must be an Azure VM size like Standard_D2s_v5."
  }
}
```

```hcl
# envs/dev/outputs.tf
output "aks_name"           { value = azurerm_kubernetes_cluster.this.name }
output "acr_login_server"   { value = azurerm_container_registry.this.login_server }
output "oidc_issuer_url"    { value = azurerm_kubernetes_cluster.this.oidc_issuer_url }
```

🧪 **Run it (then DESTROY to save credit):**

```bash
az login
cd infra/envs/dev
terraform init
terraform fmt -check && terraform validate
terraform plan -out=tfplan -var="subscription_id=$(az account show --query id -o tsv)"
terraform apply tfplan
az aks get-credentials -g rg-medilab-dev -n aks-medilab-dev
kubectl get nodes
terraform destroy -var="subscription_id=$(az account show --query id -o tsv)"
```

⚠️ **Gotcha — role assignment propagation:** Entra ID/RBAC changes can take a few minutes to propagate. A pod may ImagePullBackOff right after the first apply and then heal itself.

---

## 7. count vs for_each, and meta-arguments

| | `count` | `for_each` |
|---|---|---|
| Keyed by | Index `[0]`, `[1]` | Map/set key `["snet-appgw"]` |
| Removing an item from the middle | **Shifts indexes → destroys and recreates** later items ❌ | Only that key is removed ✅ |
| Use for | "0 or 1 of this" (`count = var.enabled ? 1 : 0`) | Collections of named things |

```hcl
lifecycle {
  prevent_destroy       = true                 # e.g., the production database
  create_before_destroy = true                 # replacement without a gap
  ignore_changes        = [tags["updated_by"]] # attributes changed outside Terraform on purpose
}
```

---

## 8. Import, moved, drift

**Bringing existing (click-ops) resources under Terraform** — the declarative `import` block (1.5+):

```hcl
import {
  to = azurerm_resource_group.legacy
  id = "/subscriptions/<sub-id>/resourceGroups/rg-medilab-legacy"
}
```

```bash
terraform plan -generate-config-out=generated.tf   # Terraform writes the resource block for you
```

**Renaming or refactoring without destroy/recreate:**

```hcl
moved {
  from = azurerm_subnet.aks
  to   = module.network.azurerm_subnet.this["snet-aks-nodes"]
}
```

**Drift** = reality differs from code (someone changed an NSG in the portal).

```bash
terraform plan -refresh-only                  # show what changed outside Terraform
terraform plan -detailed-exitcode             # exit 0 = no changes, 1 = error, 2 = changes → schedule in CI for drift alerts
```

Then you either **codify** the change (update the `.tf`) or **revert** it (apply the code).

---

## 9. Version pinning — tell the 1.15.0 story

| Constraint | Allows |
|---|---|
| `= 1.15.1` | Exactly that |
| `~> 1.15.1` | ≥ 1.15.1 and **< 1.16.0** (patches only) |
| `~> 1.15` | ≥ 1.15 and **< 2.0** ⚠️ wider than people think |
| `>= 1.15` | Anything newer, including breaking majors ❌ |

**Real 2026 example:** Terraform **1.15** was released on 29 April 2026. Shortly after, HashiCorp found **critical problems with 1.15.0** for certain configurations and advised upgrading to **1.15.1** or downgrading to **1.14.9**. Teams with unpinned CI images broke; pinned teams upgraded deliberately.

Also commit **`.terraform.lock.hcl`**. It pins exact provider versions and hashes. ⚠️ **Mac gotcha:** your lock file has `darwin_arm64` hashes. CI runs `linux_amd64`. Pre-populate both:

```bash
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64
```

**What's new in 1.15** (quotable): variables and locals allowed in module `source`/`version`, a `deprecated` attribute for variables and outputs, a `convert()` function for explicit type conversion, and Windows ARM64 builds. 1.16 is in alpha.

---

## 10. Environments: workspaces vs directories

| | CLI workspaces | Directory per environment |
|---|---|---|
| State separation | ✅ Same backend, different state key | ✅ |
| Code differences per env | Hard (conditionals on `terraform.workspace`) | Easy (separate tfvars and backend) |
| Risk of applying to the wrong env | **Higher** (the selected workspace is invisible state) | Lower (you `cd` into it) |
| Common in production | Less | **More** (often with shared modules) |

---

## 11. Terraform in CI (the IaC pipeline)

```
PR:    fmt -check → validate → tflint/checkov (policy & security) → plan → post plan as a PR comment
merge: apply the SAVED plan artifact (or re-plan + apply with approval) → store outputs
nightly: plan -detailed-exitcode → alert on drift
```

Auth in CI: **OIDC** (`ARM_USE_OIDC=true`, `ARM_CLIENT_ID`, `ARM_TENANT_ID`, `ARM_SUBSCRIPTION_ID`). No client secrets.

---

## 12. Tool comparison

| | Terraform | OpenTofu | Bicep | Pulumi | Ansible |
|---|---|---|---|---|---|
| Style | Declarative HCL | Declarative HCL (open-source fork, MPL) | Declarative, Azure-native | Real languages (TS, Python, Go) | Procedural-ish YAML tasks |
| Clouds | Multi-cloud | Multi-cloud | **Azure only** | Multi-cloud | Any (via modules) |
| State | State file | State file (+ built-in state encryption) | **No state file** (Azure Resource Manager is the state) | State (Pulumi Cloud or a backend) | Stateless |
| Main job | **Provisioning** | Provisioning | Provisioning | Provisioning | **Configuration** of servers (install packages, files) |

🎯 **Interview:** *"Terraform vs Ansible?"* → Terraform provisions infrastructure declaratively with state. Ansible configures what runs on machines (idempotent tasks over SSH). They're often used together. In a container/Kubernetes world, Ansible's role shrinks because images replace server configuration.

*"Terraform vs Bicep on Azure?"* → Bicep has day-0 support for new Azure features and no state file to manage. Terraform is multi-cloud, has a bigger ecosystem, and uses one workflow for Azure, Kubernetes, Cloudflare, and more.

---

## 13. Gotchas summary

| Trap | Reality |
|---|---|
| Changing a resource's `name` in code | Many Azure resources can't be renamed → **destroy + create** (`-/+` in the plan). Read the plan! |
| Deleting a map key in `for_each` | Destroys that resource. Intended? |
| A secret in `terraform.tfvars` committed to Git | Leaked. Use env vars/Key Vault; `.gitignore` the `*.tfvars` holding secrets |
| `terraform apply` without a plan file in CI | What gets applied may differ from what was reviewed |
| Service CIDR overlaps the VNet | AKS creation fails, or routing breaks |
| Manual portal change | Drift; the next apply may revert it |

---

## 🎯 Quick-fire interview questions

1. What is Terraform state and why remote? → See §3
2. `terraform plan` shows `-/+` on the database. What do you do? → Stop. Find which attribute forces replacement, and avoid it (or plan a migration). Add `prevent_destroy` to critical resources
3. How do you import an existing resource? → An `import` block + `plan -generate-config-out`, then apply
4. Module vs resource? → A module is a reusable collection of resources with inputs and outputs, like a function
5. How do you manage multiple environments? → A directory per env with shared modules, separate state keys, different tfvars, and a promotion flow
6. What's a provider? → A plugin that translates HCL resources into API calls (azurerm → Azure Resource Manager)
