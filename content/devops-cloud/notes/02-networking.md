# 02 · Networking Fundamentals

> A large share of production incidents come down to DNS, a port, a firewall rule, or TLS. This note gives you the model to debug them layer by layer.

---

## 1. The layer model (the practical version)

| Layer (TCP/IP) | OSI # | What lives here | Tools to test it | Azure/K8s object |
|---|---|---|---|---|
| Application | 7 | HTTP, DNS, TLS*, gRPC | `curl -v`, `dig`, `openssl s_client` | App Gateway (L7), Ingress/Gateway API |
| Transport | 4 | TCP, UDP, ports | `nc -zv`, `ss`, `telnet` | Azure Load Balancer (L4), K8s Service |
| Internet | 3 | IP, routing, ICMP | `ping`, `traceroute`, `ip r` | VNet, route tables (UDR), peering |
| Link | 2 | MAC, ARP, Ethernet | `ip link`, `arp` | (abstracted away in cloud) |

*TLS sits between L4 and L7. Say "on top of TCP, below HTTP."

🎯 **Interview:** *"L4 vs L7 load balancer?"* → L4 routes on IP and port and can't see HTTP. It's fast and protocol-agnostic. L7 understands HTTP, so it can route on host/path/headers, terminate TLS, rewrite, and apply a WAF. Azure: Load Balancer = L4, Application Gateway / Front Door = L7.

---

## 2. IP addressing and CIDR — you WILL be asked to subnet

**Concept:** `10.10.0.0/16` means the first 16 bits are the network, and the remaining 16 bits are for hosts: 2^16 = 65,536 addresses.

| CIDR | Addresses | Azure usable (−5) | Typical use |
|---|---|---|---|
| /16 | 65,536 | 65,531 | A whole VNet |
| /22 | 1,024 | 1,019 | AKS node subnet |
| /24 | 256 | 251 | A normal subnet |
| /26 | 64 | 59 | `AzureBastionSubnet` (minimum size) |
| /27 | 32 | 27 | Small, e.g. private endpoints |
| /29 | 8 | 3 | Azure's smallest (/29) |

Formula: addresses = 2^(32 − prefix).

⚠️ **Gotcha — Azure reserves 5 IPs per subnet:** the network address, the first three host addresses (gateway and Azure DNS), and the broadcast address. A /24 gives 251 usable, not 254.

**Private ranges (RFC 1918)** — never routed on the internet:
`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`

⚠️ **Gotcha — overlapping CIDRs:** if the dev VNet and the office network both use `10.0.0.0/16`, you can't peer them or connect them over VPN. Plan non-overlapping ranges **before** you build. Changing it later means rebuilding.

🧪 **Lab — address plan for medilab (one VNet per environment):**

```
vnet-medilab-dev        10.10.0.0/16
├── snet-aks-nodes      10.10.0.0/22    (1,019 usable, node IPs)
├── snet-appgw          10.10.8.0/24    (Application Gateway needs its own subnet)
├── snet-private-ep     10.10.9.0/24    (Postgres, Key Vault, ACR private endpoints)
└── AzureBastionSubnet  10.10.10.0/26   (name is mandatory, min /26)

vnet-medilab-prod       10.20.0.0/16    (no overlap → can be peered later)
```

With **Azure CNI Overlay** (the common AKS choice), pods get IPs from a separate overlay CIDR (e.g., `192.168.0.0/16`), *not* from the VNet. That's why the node subnet can stay small.

---

## 3. DNS — "it's always DNS"

**Resolution flow for `api.medilab.com`:**

1. Browser/OS cache → `/etc/hosts` → the resolver in `/etc/resolv.conf`
2. Recursive resolver (ISP, 1.1.1.1, or Azure DNS at `168.63.129.16`)
3. Root servers → `.com` TLD servers → the authoritative nameserver for `medilab.com`
4. The answer is cached for the **TTL**

| Record | Purpose | Example |
|---|---|---|
| `A` / `AAAA` | Name → IPv4 / IPv6 | `api → 20.50.1.10` |
| `CNAME` | Alias to another name (not allowed at the zone apex) | `www → medilab.azurefd.net` |
| `TXT` | Arbitrary text: domain verification, SPF | `"v=spf1 ..."` |
| `MX` | Mail servers | |
| `NS` | Which servers are authoritative | |
| `SOA` | Zone metadata | |

```bash
dig +short api.medilab.com           # just the answer
dig api.medilab.com @8.8.8.8         # ask a specific resolver
dig +trace api.medilab.com           # walk the delegation chain
nslookup api.medilab.com
```

⚠️ **Gotcha — TTL during migrations:** lower the TTL (e.g., to 60 s) *a day before* you switch DNS. Otherwise clients keep the old IP for the old TTL, which may be hours.

⚠️ **Gotcha — private endpoints and DNS:** a private endpoint only works if the name resolves to the *private* IP. That needs a **Private DNS zone** (e.g., `privatelink.postgres.database.azure.com`) linked to the VNet. "Connection timed out to the DB after enabling a private endpoint" is usually a DNS problem.

**In Kubernetes:** CoreDNS gives services names like `medilab-api.medilab.svc.cluster.local`. Short names work within the same namespace.

---

## 4. TCP, UDP, and ports

**TCP three-way handshake:** `SYN →`, `← SYN-ACK`, `ACK →`. The connection is then established. Closing uses FIN/ACK in both directions.

| | TCP | UDP |
|---|---|---|
| Connection | Yes (handshake) | No |
| Delivery | Reliable, ordered, retransmits | Best effort |
| Overhead | Higher | Lower |
| Used by | HTTP/1.1, HTTP/2, SSH, Postgres | DNS (mostly), video, VoIP. HTTP/3 (QUIC) is built on UDP |

**Ports to know:** 22 SSH · 53 DNS · 80 HTTP · 443 HTTPS · 3306 MySQL · 5432 Postgres · 6379 Redis · 5672 RabbitMQ · 9090 Prometheus · 3000 Grafana · 6443 Kubernetes API · 10250 kubelet

**Diagnosing with symptoms:**

| Symptom from `nc -zv host port` / `curl` | Likely meaning |
|---|---|
| `Connection refused` (fast) | The host is reachable, but **nothing is listening** on that port (app down, wrong port, bound to 127.0.0.1) |
| `Connection timed out` (slow) | Packets are being **dropped**: firewall/NSG, wrong route, the host is down |
| `Could not resolve host` | **DNS** |
| TLS/certificate error | Reachable, but the cert is expired, has the wrong hostname, or the chain is incomplete |

🎯 **Interview:** *"Connection refused vs timed out?"* That table is the answer. It tells you whether to look at the app or at the network.

---

## 5. HTTP and TLS

**HTTP status classes you'll debug:**

| Code | Meaning | Usual cause in our stack |
|---|---|---|
| 400 | Bad request | Client bug |
| 401 / 403 | Not authenticated / not allowed | Token, RBAC |
| 404 | Not found | Wrong path, or a missing route/rule |
| 413 | Payload too large | Proxy body size limit (lab report uploads!) |
| 429 | Rate limited | |
| 500 | App crashed on this request | Code bug. Check app logs |
| 502 | Bad gateway — the proxy got an invalid response or the connection closed | App crashed, wrong target port |
| 503 | Service unavailable — no healthy backend | No ready pods, or the Service selector matches nothing |
| 504 | Gateway timeout — the backend was too slow | Slow DB query, gunicorn timeout < proxy timeout |

**TLS 1.3 handshake (simplified):** the client sends supported ciphers + a key share → the server replies with its choice, key share, certificate, and a signature proving it owns the key → both derive session keys → encrypted traffic. It's one round trip.

The **certificate** proves identity: a CA signs "this public key belongs to `api.medilab.com`." The client checks the chain up to a trusted root, the expiry, and the hostname (SAN).

```bash
openssl s_client -connect api.medilab.com:443 -servername api.medilab.com </dev/null \
  | openssl x509 -noout -subject -issuer -dates
curl -vI https://api.medilab.com 2>&1 | grep -E "expire|subject|issuer"
```

⚠️ **Gotcha — certificate expiry** is a classic avoidable outage. Automate renewal with cert-manager (in K8s) or Key Vault auto-rotation, **and** alert 14+ days before expiry.

**TLS termination** — where HTTPS is decrypted:

| Where | Pros | Cons |
|---|---|---|
| At the edge (App Gateway / Front Door) | Central cert management, WAF can inspect traffic | Traffic inside the VNet is plaintext unless re-encrypted |
| At the ingress/gateway in the cluster | Certs managed by cert-manager | |
| End-to-end (re-encrypt to the pod) | Encrypted everywhere | More certs to manage |

🏥 **Healthcare angle:** PHI must be encrypted **in transit**. Be ready to say "TLS at the edge, and re-encryption or a service mesh with mTLS inside if the compliance scope requires it."

---

## 6. NAT, proxies, firewalls

- **NAT (SNAT):** many private IPs share one public IP for *outbound* traffic. In Azure: NAT Gateway, or the Load Balancer's outbound rules. ⚠️ **SNAT port exhaustion** happens when an app opens too many outbound connections without pooling, and connections start failing intermittently.
- **Reverse proxy** (nginx, App Gateway): sits in front of servers and receives client traffic. Used for TLS, routing, caching, and load balancing.
- **Forward proxy:** sits in front of *clients* and controls or inspects their outbound traffic.

| | Stateful firewall | Stateless firewall |
|---|---|---|
| Remembers connections? | Yes — return traffic is allowed automatically | No — you need rules for both directions |
| Examples | **Azure NSG**, AWS Security Group, iptables with conntrack | AWS NACL |

⚠️ **Gotcha — NSG rule priority:** lower number = evaluated first (100–4096). The first match wins. The default rules (65000+) allow VNet-to-VNet traffic and deny inbound from the internet.

---

## 7. "What happens when you type `https://api.medilab.com/orders`" — DevOps depth

1. **DNS** resolves the name (a CNAME to Front Door or App Gateway's public IP)
2. **TCP handshake** to that IP on 443
3. **TLS handshake**. The cert is validated. The edge may apply **WAF** rules
4. The edge **routes** (L7) to the AKS ingress/gateway (public or via private IP)
5. The **Gateway/Ingress** controller matches host and path → **Service** `medilab-api`
6. **kube-proxy** rules (iptables/nftables) or eBPF (Cilium) pick a **ready** pod endpoint
7. The **pod**: gunicorn → Django view → **Postgres** over a private endpoint (DNS → private IP)
8. The response travels back along the same path. Logs, metrics, and traces are emitted at every hop

This answer lets you show breadth. Pause at any hop and say "and this is where I'd look if X broke."

---

## 8. Troubleshooting ladder (outside → in)

```bash
dig +short api.medilab.com                                  # 1. DNS OK?
nc -zv api.medilab.com 443                                  # 2. Port reachable?
curl -vI https://api.medilab.com                            # 3. TLS + HTTP status?
kubectl get pods,svc,endpointslices -n medilab              # 4. Backends ready?
kubectl logs deploy/medilab-api -n medilab --tail=100       # 5. App errors?
kubectl exec -it deploy/medilab-api -n medilab -- nc -zv <db-host> 5432   # 6. Dependencies?
```

---

## 🎯 Quick-fire interview questions

1. How many usable IPs in an Azure /27? → 32 − 5 = **27**
2. Why can't you put a CNAME at the zone apex? → The apex must hold SOA/NS records, and a CNAME can't coexist with other records. Use ALIAS/flattening, or an Azure DNS alias record.
3. What is a VNet peering limitation? → It's **non-transitive**: if A↔B and B↔C, A cannot reach C without a hub/NVA/Virtual WAN.
4. Service endpoint vs private endpoint? → See [09-azure](../devops-cloud/08-azure.md) §4. A private endpoint gives the service a private IP *in your VNet*. A service endpoint keeps the public IP but allows only your subnet.
5. The site works by IP but not by name? → DNS. The site works from one pod but not another? → NetworkPolicy, a node, or CoreDNS.
