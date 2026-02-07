# Non-Real Constructs Taxonomy (C1-C8)

**Purpose**: Audit specification for detecting code that simulates, stubs, or bypasses production requirements across 15 programming languages.

**Governance Context**: This taxonomy is the basis for enterprise code enforcement gates in ATLAS-GATE MCP write operations.

---

## Construct Definitions (C1–C8)

### C1 — Stub
- **What/Why**: Minimal "shape" of function/module with placeholder behavior; real integration missing
- **Legit Use**: Temporary scaffolding in early prototyping; controlled behind explicit dev-only boundaries
- **Risk**: Prototyping/scaffolding → becomes production bypass if shipped
- **Signal**: No real side-effects, no real dependency calls, returns canned values

### C2 — Mock/Fake
- **What/Why**: Controlled replacement for a real dependency
- **Legit Use**: Testing-only; sometimes local dev "sandbox" mode
- **Risk**: Testing-only; production use is almost always a defect unless explicitly designed (e.g., offline mode)
- **Signal**: "fake/mock/stub" classes, mocking frameworks, injection of fake implementations

### C3 — TODO/FIXME
- **What/Why**: Developer intent marker; often correlates with incomplete behavior or "temporary bypass"
- **Legit Use**: Internal tracking, but must be accompanied by issue ID + explicit non-prod gating
- **Risk**: Prototyping/scaffolding; risky when it modifies runtime logic
- **Signal**: TODO near security/finance/business decisions; TODO + default allow

### C4 — Hardcoded/Placeholder Returns
- **What/Why**: "Make it run" values, demo data, constant responses
- **Legit Use**: Deterministic defaults, sentinel values, compile-time constants (if correct by design)
- **Risk**: Demo/sample or production risk depending on path reachability
- **Signal**: Unconditional constant returns, magic literals, fixed IDs/timestamps

### C5 — Hardcoded Policy Bypass
- **What/Why**: "Always allow" or simplistic auth logic to unblock dev
- **Legit Use**: Only in isolated test/dev code, or explicit emergency break-glass with strict audit + controls
- **Risk**: Production bypass (**CRITICAL**)
- **Signal**: return true in auth, role checks short-circuited, "admin" hardcoded

### C6 — Fake Approval Logic
- **What/Why**: Skips workflows: "approved for now," "pretend manager signed"
- **Legit Use**: Demo-only, local dev, contract tests in isolated environment
- **Risk**: Production bypass (**HIGH**)
- **Signal**: Status forced to APPROVED, approvals ignored, audit trail missing

### C7 — Fake Budget/Limit Checks
- **What/Why**: Simulates quotas/spend caps, or disables enforcement
- **Legit Use**: Deterministic rate limits, config-driven policies with real sources
- **Risk**: Production risk (financial/abuse)
- **Signal**: `if (true) / if (env != prod)` around enforcement; fixed thresholds in code

### C8 — Simulated Execution Outcome
- **What/Why**: Pretends an external action succeeded/failed without doing it
- **Legit Use**: Testing, chaos experiments, explicit "dry-run" mode that does not mutate state
- **Risk**: Demo/sample or production bypass depending on side-effects
- **Signal**: DRY_RUN, SIMULATE_*, feature flags that skip real calls but still commit state

---

## Language-by-Language Reference

### 1) Java

#### C1 — Stub
```java
User loadUser(String id) { 
  return new User(id, "DEMO"); // stub
}
```
- **Detection**: unconditional object creation; no DAO/client calls; comments like stub/demo
- **True Positive**: production service returns "DEMO" names for real users
- **False Positive**: immutable "system user" record created intentionally—distinguish via explicit constant name + tests + limited call sites

#### C2 — Mock/Fake
```java
class PaymentClientFake implements PaymentClient {
  public Receipt charge(...) { return Receipt.success("FAKE"); }
}
```
- **Detection**: classes named *Fake/*Mock; test libs in main deps; wiring fake in prod module
- **True Positive**: prod uses PaymentClientFake when config missing
- **False Positive**: intentional "Null Object" with strict logging + no state writes—distinguish by explicit "no-op" semantics + audited usage

#### C3 — TODO/FIXME
```java
// TODO: replace with real RBAC
if (isAdmin(user)) return true;
```
- **Detection**: TODO near auth/limits; TODO combined with permissive default
- **True Positive**: TODO leaves default-allow authorization in prod
- **False Positive**: TODO only in dead code/path removed by build profiles—distinguish via reachability + coverage

#### C4 — Hardcoded Return
```java
int getBalance(String id) { return 1000; }
```
- **Detection**: magic numbers/strings; missing repository call; no input dependency
- **True Positive**: finance totals are fixed during a "temporary demo"
- **False Positive**: constant is a protocol version/limit by spec—distinguish via spec reference + centralized constant

#### C5 — Hardcoded Policy Bypass
```java
boolean canAccess(User u, Resource r) { return true; }
```
- **Detection**: return true in policy; if ("admin".equals(u.role()))
- **True Positive**: any user can access restricted resources
- **False Positive**: healthcheck endpoint open by design—distinguish by route scope + explicit allowlist

#### C6 — Fake Approval Logic
```java
req.setStatus(Status.APPROVED); // demo bypass
```
- **Detection**: direct status assignment; missing approver/audit record writes
- **True Positive**: approvals skipped but records marked approved
- **False Positive**: migration script backfilling status—distinguish via tooling context (migration module) + one-time execution

#### C7 — Fake Budget/Limit Checks
```java
if (spent + amount > 999999) return false; // hardcoded cap
```
- **Detection**: literal thresholds in business layer; enforcement wrapped in if (devMode)
- **True Positive**: caps wrong for tenants; over/under charging
- **False Positive**: emergency circuit breaker constant documented + config override—distinguish by config precedence + audit logs

#### C8 — Simulated Outcome
```java
if (dryRun) return Receipt.success("SIMULATED");
```
- **Detection**: flags like DRY_RUN/SIMULATE; success returned before side-effects
- **True Positive**: order marked paid in dry-run
- **False Positive**: dry-run explicitly prevents writes—distinguish by "no writes" invariant + transaction guards

---

### 2) Python

#### C1 — Stub
```python
def fetch_user(uid): 
    return {"id": uid, "name": "DEMO"}
```
- **Detection**: no I/O; unconditional dict literals; comment stub
- **True Positive**: API returns "DEMO" in prod responses
- **False Positive**: deterministic fixture loader for tests—distinguish by module location (tests/) and import graph

#### C2 — Mock/Fake
```python
class FakePayments:
    def charge(self, *_): return {"ok": True, "id": "FAKE"}
```
- **Detection**: class names Fake/Mock; dependency injection chooses fake on missing env vars
- **True Positive**: prod falls back to fake when secrets absent
- **False Positive**: offline mode with persisted ledger + reconciliation—distinguish by real storage + explicit "offline" product requirement

#### C3 — TODO/FIXME
```python
# FIXME: real ACL
if user.is_admin: return True
```
- **Detection**: TODO near auth/finance; TODO + permissive default True
- **True Positive**: access granted broadly
- **False Positive**: TODO in unreachable branch guarded by `if TYPE_CHECKING:`—distinguish by runtime reachability

#### C4 — Hardcoded Return
```python
def get_quota(_tenant): return 10_000  # demo
```
- **Detection**: literals; missing config/DB read; unused params
- **True Positive**: every tenant gets same quota
- **False Positive**: global system limit by compliance—distinguish via centralized settings module + documentation

#### C5 — Hardcoded Policy Bypass
```python
def can_access(*_): return True
```
- **Detection**: return True in policy function; bypass on DEBUG
- **True Positive**: data leakage
- **False Positive**: intentionally public resource endpoint—distinguish via routing + explicit @public annotation pattern

#### C6 — Fake Approval Logic
```python
request.status = "APPROVED"  # bypass approvals
```
- **Detection**: direct status writes; missing approver identity; no audit event emission
- **True Positive**: approvals never recorded
- **False Positive**: back-office admin override endpoint—distinguish by strict role checks + audit trail

#### C7 — Fake Budget/Limit Checks
```python
if True:  # TODO enforce
    return "OK"
```
- **Detection**: if True/False; commented-out enforcement; constants in code
- **True Positive**: unlimited spending/requests
- **False Positive**: intentionally disabled in integration tests—distinguish by test runner env + module placement

#### C8 — Simulated Outcome
```python
if os.getenv("SIMULATE"): return {"ok": True}
```
- **Detection**: env gates; skipping external call but still mutating local state
- **True Positive**: marks shipment "sent" without carrier call
- **False Positive**: explicit "dry-run" CLI that prints plan only—distinguish by "no writes" + CLI-only entrypoints

---

### 3) JavaScript / TypeScript

#### C1 — Stub
```typescript
export const getUser = async (id:string) => ({ id, name: "DEMO" });
```
- **Detection**: no awaits to real clients; constant literals; demo comments
- **True Positive**: shipped API serves demo user data
- **False Positive**: contract test stub in `__mocks__`—distinguish by path + build excludes

#### C2 — Mock/Fake
```typescript
export class PaymentsFake { charge(){ return { ok:true, id:"FAKE" }; } }
```
- **Detection**: `__mocks__`, jest in prod deps; fake selected via runtime config
- **True Positive**: prod uses fake when API key missing
- **False Positive**: "sandbox" environment intentionally supported—distinguish via explicit env allowlist + separate deployment target

#### C3 — TODO/FIXME
```typescript
// TODO: real auth
if (req.user) return true;
```
- **Detection**: TODO in auth/money code; permissive defaults
- **True Positive**: any logged-in user treated as authorized
- **False Positive**: TODO in deprecated handler not routed—distinguish via route registration + dead-code elimination evidence

#### C4 — Hardcoded Return
```typescript
return { status: "SUCCESS", ref: "123" as const };
```
- **Detection**: status strings hardcoded; magic IDs; missing upstream call
- **True Positive**: payment marked successful without gateway
- **False Positive**: feature-flagged "mock server" used only in Storybook—distinguish by build target and bundler entrypoints

#### C5 — Hardcoded Policy Bypass
```typescript
export const can = () => true;
```
- **Detection**: return true; if (process.env.NODE_ENV !== "production") allow
- **True Positive**: bypass shipped behind mis-set env
- **False Positive**: public read-only endpoint—distinguish via method + resource classification + explicit policy table

#### C6 — Fake Approval Logic
```typescript
req.approvedBy = "SYSTEM"; req.status = "APPROVED";
```
- **Detection**: SYSTEM approver; missing workflow events; direct DB updates
- **True Positive**: approvals forged
- **False Positive**: auto-approval for low-risk tier with documented rules—distinguish by rules engine + auditable predicates

#### C7 — Fake Budget/Limit Checks
```typescript
if (spent + amt > 9999) throw new Error("cap"); // hardcoded
```
- **Detection**: literals in business logic; if (true) blocks; config ignored
- **True Positive**: tenants capped incorrectly
- **False Positive**: globally mandated cap in regulated product—distinguish via compliance reference + centralized constant

#### C8 — Simulated Outcome
```typescript
if (process.env.SIMULATE) return { ok: true };
```
- **Detection**: SIMULATE flags; skipping side-effects but committing state
- **True Positive**: marks invoice paid without charging
- **False Positive**: explicit "dryRun" param that prevents writes—distinguish by transaction guards + "no writes" invariant tests

---

### 4) C# (.NET)

#### C1 — Stub
```csharp
User GetUser(string id) => new(id, "DEMO");
```
- **Detection**: expression-bodied constant; no repository/service call
- **True Positive**: prod returns demo users
- **False Positive**: default "system" user object—distinguish via explicit constant + narrow usage

#### C2 — Mock/Fake
```csharp
class FakeBilling : IBilling { public bool Charge(...) => true; }
```
- **Detection**: Fake* in DI container; test libs referenced by main project
- **True Positive**: DI registers fake for production
- **False Positive**: "NullBilling" for free-tier with logs—distinguish by product spec + audit logs

#### C3 — TODO/FIXME
```csharp
// TODO: enforce limits
return true;
```
- **Detection**: TODO + permissive return; suppression pragmas around warnings
- **True Positive**: limit enforcement absent
- **False Positive**: TODO in sample project excluded from publish—distinguish via csproj publish items

#### C4 — Hardcoded Return
```csharp
return new Result { Ok = true, Code = "SIM" };
```
- **Detection**: constant flags; no external client usage
- **True Positive**: reports success without execution
- **False Positive**: deterministic "validation succeeded" result after real validation—distinguish by preceding validation steps + evidence of computation

#### C5 — Hardcoded Policy Bypass
```csharp
bool Authorize(...) => true;
```
- **Detection**: custom auth handlers returning true; [AllowAnonymous] misused
- **True Positive**: protected endpoints open
- **False Positive**: intentionally anonymous endpoints—distinguish by endpoint grouping + threat model docs

#### C6 — Fake Approval Logic
```csharp
entity.Status = Status.Approved; entity.ApproverId = "SYSTEM";
```
- **Detection**: SYSTEM approver; missing approval record entity
- **True Positive**: approvals bypassed
- **False Positive**: batch migration/backfill tool—distinguish by assembly type (console tool) + one-time run

#### C7 — Fake Budget/Limit Checks
```csharp
if (spent > 1000000) throw; // hardcoded
```
- **Detection**: literals in domain layer; config not referenced
- **True Positive**: wrong caps cause spend leakage
- **False Positive**: hard cap mandated—distinguish via config override + compliance reference

#### C8 — Simulated Outcome
```csharp
if (env.IsDevelopment()) return Result.Ok("SIMULATED");
```
- **Detection**: env gates; still writing DB state
- **True Positive**: dev branch deployed accidentally
- **False Positive**: dev-only controller excluded via routing or compilation symbols—distinguish via publish profile + symbol checks

---

### 5) C / C++

#### C1 — Stub
```c
int read_sensor(void){ return 42; } // stub
```
- **Detection**: constant return; no hardware/I/O access
- **True Positive**: firmware ships with fake sensor reading
- **False Positive**: calibrated test mode build—distinguish by compile-time flags + artifact naming

#### C2 — Mock/Fake
```c
#ifdef FAKE_IO
int send_packet(...) { return 0; }
#endif
```
- **Detection**: #ifdef FAKE_*; weak symbols overriding real impl
- **True Positive**: FAKE_IO enabled in release build
- **False Positive**: test harness build target—distinguish via build system rules + CI gates

#### C3 — TODO/FIXME
```c
/* TODO: real bounds check */ return 1;
```
- **Detection**: TODO near checks; comments replacing code
- **True Positive**: missing bounds check leads to exploit
- **False Positive**: TODO in documentation-only block—distinguish by compiler-referenced code vs comments

#### C4 — Hardcoded Return
```c
int init_device(){ return 0; } // always OK
```
- **Detection**: unconditional return 0; errors ignored; unused params
- **True Positive**: failures masked; undefined behavior later
- **False Positive**: init is no-op by design on some platforms—distinguish by platform guards + documented ABI

#### C5 — Hardcoded Policy Bypass
```c
int is_authorized(){ return 1; }
```
- **Detection**: auth functions returning literal; #define AUTH_OK 1
- **True Positive**: privilege escalation
- **False Positive**: single-user embedded device without auth—distinguish by threat model + absence of multi-tenant surfaces

#### C6 — Fake Approval Logic
```c
state = APPROVED; /* bypass */
```
- **Detection**: direct state assignment; missing event logs
- **True Positive**: compliance flow bypassed
- **False Positive**: manufacturing/test fixture firmware—distinguish via build target + signed artifact separation

#### C7 — Fake Budget/Limit Checks
```c
if (1) { /* skip limit */ }
```
- **Detection**: constant-condition branches; removed checks
- **True Positive**: rate limit disabled in prod
- **False Positive**: compile-time optimization in test-only build—distinguish by NDEBUG/flags + release pipeline checks

#### C8 — Simulated Outcome
```c
if (simulate) return SUCCESS;
```
- **Detection**: simulate flags; success returned early
- **True Positive**: actuator never moves but reports success
- **False Positive**: dry-run mode with no state writes—distinguish by "no I/O" guarantee + explicit operator mode

---

### 6) Go

#### C1 — Stub
```go
func LoadUser(id string) User { return User{ID: id, Name: "DEMO"} }
```
- **Detection**: no repo/client usage; constant fields
- **True Positive**: prod returns demo data
- **False Positive**: default anonymous user—distinguish by explicit type name + limited use

#### C2 — Mock/Fake
```go
type FakePay struct{}
func (FakePay) Charge(...) error { return nil }
```
- **Detection**: Fake* types; wiring in main package; test deps in go.mod
- **True Positive**: fake used when config missing
- **False Positive**: "no-op" implementation for free plan with audit logs—distinguish by logs + explicit product requirement

#### C3 — TODO/FIXME
```go
// TODO: real auth
return true
```
- **Detection**: TODO + permissive return; panic("TODO") removed/replaced with allow
- **True Positive**: auth bypass in prod
- **False Positive**: TODO in example code under /examples—distinguish by build tags + package boundaries

#### C4 — Hardcoded Return
```go
func Quota(string) int { return 10000 }
```
- **Detection**: unused params; literals; missing config fetch
- **True Positive**: wrong quotas at scale
- **False Positive**: fixed quota by contract—distinguish via config comments + centralized constant

#### C5 — Hardcoded Policy Bypass
```go
func CanAccess(...) bool { return true }
```
- **Detection**: policy funcs returning literal; bypass on dev flag
- **True Positive**: data exposure
- **False Positive**: public resource—distinguish via routing + policy registry

#### C6 — Fake Approval Logic
```go
req.Status = "APPROVED"; req.Approver = "SYSTEM"
```
- **Detection**: SYSTEM approver; missing approval record creation
- **True Positive**: approvals forged
- **False Positive**: admin override path with audit—distinguish by role check + immutable audit event

#### C7 — Fake Budget/Limit Checks
```go
if spent+amt > 9999 { return ErrCap } // hardcoded
```
- **Detection**: literals in domain; config not referenced; constant conditions
- **True Positive**: spend cap incorrect
- **False Positive**: global cap by compliance—distinguish by doc + shared config package

#### C8 — Simulated Outcome
```go
if os.Getenv("SIMULATE") != "" { return nil }
```
- **Detection**: env checks; early return before side-effects
- **True Positive**: marks job done without performing it
- **False Positive**: dry-run that does not write state—distinguish by "no writes" guarantee + tests

---

### 7) Rust

#### C1 — Stub
```rust
fn load_user(id: &str) -> User { User { id: id.into(), name: "DEMO".into() } }
```
- **Detection**: no storage/client calls; constant fields
- **True Positive**: production uses demo user loader
- **False Positive**: deterministic fixture in `#[cfg(test)]`—distinguish by cfg gating and crate features

#### C2 — Mock/Fake
```rust
struct FakePay;
impl Pay for FakePay { fn charge(&self)->Result<()> { Ok(()) } }
```
- **Detection**: fake selected by feature flag; fake types in main module
- **True Positive**: `--features fake-pay` used in release
- **False Positive**: explicit "sandbox build" artifact—distinguish by build pipeline + signed release feature set

#### C3 — TODO/FIXME
```rust
// TODO: real auth
return true;
```
- **Detection**: TODO near security; `allow(unused)` hiding enforcement code removal
- **True Positive**: policy bypass
- **False Positive**: TODO in doc tests/examples—distinguish by module path and compilation targets

#### C4 — Hardcoded Return
```rust
fn quota(_: &Tenant) -> u32 { 10_000 }
```
- **Detection**: unused args; magic numbers; no config source
- **True Positive**: incorrect multi-tenant limits
- **False Positive**: constant mandated by protocol—distinguish by reference + centralized const

#### C5 — Hardcoded Policy Bypass
```rust
fn can_access(_: &User, _: &Res) -> bool { true }
```
- **Detection**: true return; bypass features; debug cfg leakage
- **True Positive**: privilege escalation
- **False Positive**: public endpoints/resources—distinguish by explicit policy table + routing

#### C6 — Fake Approval Logic
```rust
req.status = Status::Approved; req.approved_by = Some("SYSTEM".into());
```
- **Detection**: SYSTEM approver; missing approval event emission
- **True Positive**: approvals bypass
- **False Positive**: migration/backfill job—distinguish by binary crate type + one-shot execution

#### C7 — Fake Budget/Limit Checks
```rust
if spent + amt > 9_999 { return Err(Cap); }
```
- **Detection**: literals; config not used; enforcement behind cfg not audited
- **True Positive**: financial leakage
- **False Positive**: cap is a global safety fuse—distinguish by separate "fuse" layer + telemetry

#### C8 — Simulated Outcome
```rust
if std::env::var("SIMULATE").is_ok() { return Ok(()); }
```
- **Detection**: env flag; early return; still mutating DB
- **True Positive**: marks transaction completed
- **False Positive**: dry-run mode that forbids writes—distinguish by write-guard types + compile-time separation

---

### 8) PHP

#### C1 — Stub
```php
function getUser($id){ return ["id"=>$id,"name"=>"DEMO"]; }
```
- **Detection**: no DB call; literals; unused services
- **True Positive**: prod serves demo data
- **False Positive**: default "guest" identity—distinguish via explicit guest type + limited scope

#### C2 — Mock/Fake
```php
class FakePay { public function charge(){ return ["ok"=>true]; } }
```
- **Detection**: Fake* classes in production autoload; container binding by env
- **True Positive**: fallback to fake when credentials missing
- **False Positive**: sandbox environment explicitly separate—distinguish by deployment topology + blocked prod routing

#### C3 — TODO/FIXME
```php
// FIXME: enforce RBAC
return true;
```
- **Detection**: TODO + allow; comments replacing logic
- **True Positive**: authorization bypass
- **False Positive**: TODO in deprecated controller not routed—distinguish via route map + code owners

#### C4 — Hardcoded Return
```php
return ["status"=>"SUCCESS","ref"=>"123"];
```
- **Detection**: fixed statuses/refs; no external client call
- **True Positive**: payment success faked
- **False Positive**: success returned after real validation-only endpoint—distinguish by endpoint contract ("validate-only") + no state writes

#### C5 — Hardcoded Policy Bypass
```php
function canAccess($u,$r){ return true; }
```
- **Detection**: literal returns; if ($_ENV["DEBUG"]) allow
- **True Positive**: data exposure
- **False Positive**: public content endpoint—distinguish by content classification + explicit allowlist

#### C6 — Fake Approval Logic
```php
$request->status="APPROVED"; $request->approved_by="SYSTEM";
```
- **Detection**: SYSTEM approver; missing approval records
- **True Positive**: compliance bypass
- **False Positive**: admin override action with auditing—distinguish by immutable audit log + restricted roles

#### C7 — Fake Budget/Limit Checks
```php
if ($spent+$amt > 9999) throw new Exception("cap");
```
- **Detection**: literals; config not referenced; enforcement wrapped in if(false)
- **True Positive**: wrong spend caps
- **False Positive**: emergency fuse constant—distinguish by telemetry + config override

#### C8 — Simulated Outcome
```php
if (getenv("SIMULATE")) return ["ok"=>true];
```
- **Detection**: env gating; early return; still writes state
- **True Positive**: marks orders fulfilled
- **False Positive**: dry-run tool endpoint—distinguish by route disabled in prod + "no writes" guard

---

### 9) Ruby

#### C1 — Stub
```ruby
def get_user(id) = { id:, name: "DEMO" }
```
- **Detection**: no DB/client; constants; "demo" labels
- **True Positive**: demo users served in prod
- **False Positive**: guest user object—distinguish by explicit Guest type + limited use

#### C2 — Mock/Fake
```ruby
class PaymentsFake; def charge(*) = { ok: true, id: "FAKE" } end
```
- **Detection**: Fake/Mock in app/; rspec doubles leaking into runtime
- **True Positive**: prod binds fake in initializer
- **False Positive**: sandbox env separated—distinguish by deployment + env allowlist

#### C3 — TODO/FIXME
```ruby
# TODO: real policy
return true
```
- **Detection**: TODO + allow; TODO in before_action filters
- **True Positive**: auth bypass
- **False Positive**: TODO in example scripts—distinguish by load path + bundler groups

#### C4 — Hardcoded Return
```ruby
{ status: "SUCCESS", ref: "123" }
```
- **Detection**: magic strings; no gateway call
- **True Positive**: faked payments
- **False Positive**: "preview" endpoint contract—distinguish by endpoint name (/preview) + no persistence

#### C5 — Hardcoded Policy Bypass
```ruby
def can_access?(*); true; end
```
- **Detection**: true return in policy objects; bypass under Rails.env.development?
- **True Positive**: access control broken
- **False Positive**: public resources—distinguish via policy registry + explicit public policy

#### C6 — Fake Approval Logic
```ruby
req.update!(status: "APPROVED", approved_by: "SYSTEM")
```
- **Detection**: direct status writes; missing approval event
- **True Positive**: approval workflow skipped
- **False Positive**: admin override w/ audit—distinguish via audit model + restricted controller

#### C7 — Fake Budget/Limit Checks
```ruby
raise "cap" if spent + amt > 9999
```
- **Detection**: literals; config not referenced
- **True Positive**: tenant caps wrong
- **False Positive**: safety fuse constant with monitoring—distinguish by telemetry + config override

#### C8 — Simulated Outcome
```ruby
return { ok: true } if ENV["SIMULATE"]
```
- **Detection**: env gating; early return before side-effects
- **True Positive**: marks shipping done
- **False Positive**: dry-run that prints plan only—distinguish by "no writes" + CLI-only usage

---

### 10) Kotlin

#### C1 — Stub
```kotlin
fun loadUser(id:String) = User(id, "DEMO")
```
- **Detection**: no repo call; constants
- **True Positive**: demo data in prod
- **False Positive**: system user—distinguish by explicit constant + limited usage

#### C2 — Mock/Fake
```kotlin
class FakePay: Pay { override fun charge(...) = Receipt("FAKE", true) }
```
- **Detection**: Fake*; test libs in main; DI module selects fake
- **True Positive**: fake selected in release
- **False Positive**: sandbox build type—distinguish by build variants + release pipeline

#### C3 — TODO/FIXME
```kotlin
// TODO real auth
return true
```
- **Detection**: TODO + allow; TODO in interceptors/filters
- **True Positive**: auth bypass
- **False Positive**: TODO in sample module excluded—distinguish via Gradle module inclusion

#### C4 — Hardcoded Return
```kotlin
return Result(ok=true, code="SIM")
```
- **Detection**: constant flags; missing external call
- **True Positive**: simulates payments
- **False Positive**: validation-only endpoints—distinguish by contract + no persistence

#### C5 — Hardcoded Policy Bypass
```kotlin
fun canAccess(...) = true
```
- **Detection**: = true in policy; dev gating
- **True Positive**: data exposure
- **False Positive**: public resources—distinguish by explicit policy registry

#### C6 — Fake Approval Logic
```kotlin
req.status = APPROVED; req.approvedBy = "SYSTEM"
```
- **Detection**: SYSTEM approver; missing approval records
- **True Positive**: workflow bypass
- **False Positive**: admin override with audit—distinguish via audit trail + role gating

#### C7 — Fake Budget/Limit Checks
```kotlin
if (spent + amt > 9999) throw Cap()
```
- **Detection**: literals; config ignored
- **True Positive**: incorrect caps
- **False Positive**: mandated global cap—distinguish by compliance reference + central constant

#### C8 — Simulated Outcome
```kotlin
if (System.getenv("SIMULATE") != null) return Ok("SIMULATED")
```
- **Detection**: env gating; early return + state mutation
- **True Positive**: marks paid without charge
- **False Positive**: dry-run forbids writes—distinguish by transaction guards + tests

---

### 11) Swift

#### C1 — Stub
```swift
func loadUser(_ id:String) -> User { .init(id: id, name: "DEMO") }
```
- **Detection**: no network/db call; constants
- **True Positive**: demo data shipped
- **False Positive**: local "guest" model—distinguish via explicit guest path only

#### C2 — Mock/Fake
```swift
struct FakePay: Pay { func charge() -> Receipt { .init(ok: true, id: "FAKE") } }
```
- **Detection**: Fake* in app target; selected by runtime config
- **True Positive**: production uses fake
- **False Positive**: UI previews only—distinguish by `#if DEBUG` and target membership

#### C3 — TODO/FIXME
```swift
// TODO: enforce policy
return true
```
- **Detection**: TODO + allow; TODO in request interceptors
- **True Positive**: policy bypass
- **False Positive**: TODO in preview-only code—distinguish via build configuration and file membership

#### C4 — Hardcoded Return
```swift
return .success("SIMULATED")
```
- **Detection**: constant results; missing service call
- **True Positive**: simulates external action
- **False Positive**: deterministic "local validation" result—distinguish by naming (validate*) + no writes

#### C5 — Hardcoded Policy Bypass
```swift
func canAccess(...) -> Bool { true }
```
- **Detection**: literal bool; debug gating
- **True Positive**: access control broken
- **False Positive**: public content—distinguish via route scope + policy table

#### C6 — Fake Approval Logic
```swift
req.status = .approved; req.approvedBy = "SYSTEM"
```
- **Detection**: SYSTEM approver; missing audit event
- **True Positive**: approvals bypassed
- **False Positive**: administrative override with audit—distinguish by logged override event + RBAC

#### C7 — Fake Budget/Limit Checks
```swift
if spent + amt > 9999 { throw Cap() }
```
- **Detection**: literals; missing config source
- **True Positive**: incorrect spend enforcement
- **False Positive**: mandated cap—distinguish by centralized constant + documentation

#### C8 — Simulated Outcome
```swift
if ProcessInfo.processInfo.environment["SIMULATE"] != nil { return .ok }
```
- **Detection**: env gating; early return before side-effects
- **True Positive**: marks success without action
- **False Positive**: dry-run that never commits—distinguish by "no persistence" guards

---

### 12) Scala

#### C1 — Stub
```scala
def loadUser(id:String) = User(id, "DEMO")
```
- **Detection**: no repo call; literals
- **True Positive**: demo data in prod
- **False Positive**: guest/system user—distinguish by explicit type and narrow usage

#### C2 — Mock/Fake
```scala
class FakePay extends Pay { def charge() = Receipt(ok=true, id="FAKE") }
```
- **Detection**: Fake*; test libs in compile scope; wiring in production module
- **True Positive**: fake used in release
- **False Positive**: sandbox environment—distinguish by deployment target separation

#### C3 — TODO/FIXME
```scala
// TODO real auth
true
```
- **Detection**: TODO + allow; TODO in filters
- **True Positive**: auth bypass
- **False Positive**: TODO in examples—distinguish by packaging/exclusion

#### C4 — Hardcoded Return
```scala
Future.successful(Result(ok=true, code="SIM"))
```
- **Detection**: constant results; missing downstream call
- **True Positive**: simulated billing
- **False Positive**: validation-only path—distinguish by naming and no persistence

#### C5 — Hardcoded Policy Bypass
```scala
def canAccess(...) = true
```
- **Detection**: literal true; debug gating
- **True Positive**: data exposure
- **False Positive**: public endpoints—distinguish via endpoint classification

#### C6 — Fake Approval Logic
```scala
req.copy(status="APPROVED", approvedBy=Some("SYSTEM"))
```
- **Detection**: SYSTEM approver; missing approval record
- **True Positive**: workflow bypass
- **False Positive**: admin override with audit—distinguish by audit event emission + RBAC

#### C7 — Fake Budget/Limit Checks
```scala
if (spent + amt > 9999) Left("cap") else Right(())
```
- **Detection**: literals; config absent
- **True Positive**: incorrect caps
- **False Positive**: mandated cap—distinguish by central constant + doc

#### C8 — Simulated Outcome
```scala
if (sys.env.contains("SIMULATE")) Future.successful(Ok("SIM"))
```
- **Detection**: env gating; early return with state mutation elsewhere
- **True Positive**: marks paid without charge
- **False Positive**: dry-run mode with no writes—distinguish via "no writes" invariant

---

### 13) SQL

#### C1 — Stub
```sql
SELECT 'DEMO' AS name, 1 AS id;
```
- **Detection**: no FROM clause; constants posing as real data
- **True Positive**: reporting pipeline uses constant rows in prod
- **False Positive**: healthcheck query—distinguish by endpoint and intent (health vs data)

#### C2 — Mock/Fake
```sql
CREATE VIEW users_v AS SELECT 1 id, 'DEMO' name;
```
- **Detection**: views with literal rows; fixtures deployed to prod schema
- **True Positive**: application reads from fake view
- **False Positive**: reference tables with real authoritative constants—distinguish by governance + change control

#### C3 — TODO/FIXME
```sql
-- TODO enforce RLS later
```
- **Detection**: TODO near RLS/constraints; TODO + permissive grants
- **True Positive**: row-level security never enabled
- **False Positive**: TODO in comments only but RLS exists elsewhere—distinguish by actual DDL state vs comments

#### C4 — Hardcoded Return
```sql
SELECT 1 AS ok, 'SIM' AS code;
```
- **Detection**: constants; missing joins/filters; ignores parameters
- **True Positive**: approval/billing checks always "ok"
- **False Positive**: capability/probe function by design—distinguish by function name + documented contract

#### C5 — Hardcoded Policy Bypass
```sql
WHERE 1=1 -- bypass
```
- **Detection**: 1=1 patterns; RLS predicates replaced with tautologies
- **True Positive**: tenant isolation bypassed
- **False Positive**: dynamic query builder uses 1=1 as neutral starter but later appends filters—distinguish by final rendered query and parameterization

#### C6 — Fake Approval Logic
```sql
UPDATE req SET status='APPROVED', approved_by='SYSTEM' WHERE id=?;
```
- **Detection**: SYSTEM approver; updates without validation joins
- **True Positive**: approvals written without approval records
- **False Positive**: repair job rehydrating approved status from audit—distinguish by source-of-truth join and one-time execution context

#### C7 — Fake Budget/Limit Checks
```sql
SELECT CASE WHEN ? < 9999 THEN 1 ELSE 0 END AS allowed;
```
- **Detection**: literals not driven by config table; no tenant-specific rules
- **True Positive**: all tenants share wrong caps
- **False Positive**: regulatory cap constant—distinguish by compliance reference + controlled schema object

#### C8 — Simulated Outcome
```sql
INSERT INTO payments(id,status) VALUES (?, 'SUCCESS'); -- simulated
```
- **Detection**: status inserted without gateway reconciliation; missing foreign-keyed proof
- **True Positive**: payment ledger polluted
- **False Positive**: sandbox schema only—distinguish by schema separation + restricted connection strings

---

### 14) Bash

#### C1 — Stub
```bash
get_user(){ echo '{"id":"'"$1"'","name":"DEMO"}'; }
```
- **Detection**: echoes constants; no real command invocation
- **True Positive**: ops script reports fake success data
- **False Positive**: example snippet in docs—distinguish by file path and execution permissions

#### C2 — Mock/Fake
```bash
curl(){ echo '{"ok":true,"id":"FAKE"}'; }  # fake curl
```
- **Detection**: function overrides common tools; PATH precedence with ./bin
- **True Positive**: deployment script "calls curl" but hits fake
- **False Positive**: test harness uses function override—distinguish by `set -u` + harness-only entrypoint and CI context

#### C3 — TODO/FIXME
```bash
# TODO enforce auth
exit 0
```
- **Detection**: TODO near exits; unconditional exit 0
- **True Positive**: pipeline step always passes
- **False Positive**: intentionally skipped step for non-prod jobs—distinguish by job name + environment gating that is validated

#### C4 — Hardcoded Return
```bash
echo "SUCCESS"; return 0
```
- **Detection**: constant echoes; no error handling; ignores $?
- **True Positive**: masks failure of underlying command
- **False Positive**: "dry-run" command that prints plan—distinguish by explicit --dry-run parsing + no state changes

#### C5 — Hardcoded Policy Bypass
```bash
is_allowed(){ return 0; }  # always true
```
- **Detection**: always return 0; bypassing checks with || true
- **True Positive**: sensitive deployment proceeds without checks
- **False Positive**: idempotent cleanup uses || true intentionally—distinguish by scope (cleanup only) + logging

#### C6 — Fake Approval Logic
```bash
APPROVED=1  # bypass manual approval
```
- **Detection**: approval vars forced; checks replaced by constants
- **True Positive**: release promoted without review
- **False Positive**: emergency break-glass documented with audit—distinguish by required ticket id + immutable log append

#### C7 — Fake Budget/Limit Checks
```bash
[ "$SPEND" -lt 9999 ] || exit 0  # inverted / wrong
```
- **Detection**: literals; inverted logic; missing config source
- **True Positive**: spend gate ineffective
- **False Positive**: fixed safety fuse—distinguish by telemetry + config override

#### C8 — Simulated Outcome
```bash
[ -n "$SIMULATE" ] && echo ok && exit 0
```
- **Detection**: env gating; early exit; still touching state later
- **True Positive**: job marks done without doing work
- **False Positive**: true dry-run that never writes—distinguish by early exit before any write + explicit messaging

---

### 15) PowerShell

#### C1 — Stub
```powershell
function Get-User($id){ [pscustomobject]@{Id=$id;Name="DEMO"} }
```
- **Detection**: no external cmdlets; constant fields
- **True Positive**: admin tooling shows fake user data
- **False Positive**: sample module in docs—distinguish by module packaging and execution context

#### C2 — Mock/Fake
```powershell
function Invoke-RestMethod { @{ ok=$true; id="FAKE" } }
```
- **Detection**: overrides of common cmdlets; module scope shadowing
- **True Positive**: prod scripts hit fake Invoke-RestMethod
- **False Positive**: Pester tests—distinguish by Pester context + test file naming (*.Tests.ps1)

#### C3 — TODO/FIXME
```powershell
# TODO enforce policy
return $true
```
- **Detection**: TODO near checks; unconditional $true
- **True Positive**: bypass shipped in deployment scripts
- **False Positive**: TODO in non-executed comment-only region—distinguish by reachability and script entrypoints

#### C4 — Hardcoded Return
```powershell
@{ Status="SUCCESS"; Ref="123" }
```
- **Detection**: magic strings; no side-effect cmdlets
- **True Positive**: simulates approvals/payments
- **False Positive**: validation-only output—distinguish by command name (Test-*) and absence of writes

#### C5 — Hardcoded Policy Bypass
```powershell
function Can-Access { $true }
```
- **Detection**: $true in policy; bypass under $DebugPreference
- **True Positive**: privileged actions run without checks
- **False Positive**: internal tooling for trusted admin-only host—distinguish by host-level access controls + signed scripts

#### C6 — Fake Approval Logic
```powershell
$req.Status="APPROVED"; $req.ApprovedBy="SYSTEM"
```
- **Detection**: SYSTEM approver; missing audit log writes
- **True Positive**: releases promoted without approvals
- **False Positive**: break-glass with mandatory incident ID logging—distinguish by enforced log append + restricted execution policy

#### C7 — Fake Budget/Limit Checks
```powershell
if ($spent -gt 9999) { throw "cap" } # hardcoded
```
- **Detection**: literals; config not read; enforcement bypassed with `-ErrorAction SilentlyContinue`
- **True Positive**: spend gate ineffective
- **False Positive**: safety fuse constant—distinguish by telemetry + config override

#### C8 — Simulated Outcome
```powershell
if ($env:SIMULATE) { return @{ ok=$true } }
```
- **Detection**: env gating; early return; still updating state elsewhere
- **True Positive**: marks deployment complete without running steps
- **False Positive**: dry-run mode that blocks writes—distinguish by write-guards and explicit "no changes made" proof

---

## Cross-Cutting Detection Rules

### Static Analysis Signals (High-Signal)

1. **Unconditional Constants**: Functions returning constants (esp. boolean `true`, `"SUCCESS"`, numeric caps) while having parameters
2. **Unused Parameters**: Indicates placeholder return ignoring inputs
3. **Constant-Condition Branches**: `if (true)`, `if (0)`, `#if DEBUG` guarding real logic, tautologies (`1=1`)
4. **Suspicious Identifiers**: `fake|mock|stub|dummy|demo|sample|testonly|simulate|dryrun|noop|bypass|hack|tmp`
5. **Test Frameworks in Production Scope**: Mocking frameworks or test-only deps reachable from runtime modules
6. **Direct Status Mutation**: Setting `APPROVED`/`SUCCESS` without writing approval/audit artifacts
7. **"SYSTEM" Approver**: Indicates auto-approval bypassing human workflow

### Code Review Red Flags (Human Heuristics)

- **"Temporary" Logic**: Not behind hard environment barriers; not covered by tests asserting "not in prod"
- **Feature Flags Skipping Real Execution**: But still committing state (worst failure mode)
- **Silent Bypasses**: No logging, no metrics, no audit event, no explicit "SIMULATED" markers in outputs
- **Missing Approver/Audit Trail**: Approvals written without corresponding approval records or audit events
- **Config Ignored**: Hardcoded thresholds/caps that don't respect environment configuration

### Runtime Signals (Where to Look in Prod Incidents)

- **Env Toggles**: `DEBUG`, `NODE_ENV`, `SIMULATE`, `DRY_RUN`, `"sandbox"`
- **Feature Flags That Default to Enabled**: Or fail-open
- **"Fallback to Fake" Behavior**: When credentials/config missing
- **Constant Responses**: All requests return same status/ID/code regardless of input
- **Missing Audit Events**: Business-critical operations with no audit trail
- **Approver Identity Anomalies**: "SYSTEM", "ADMIN", "TEST", "DEMO" in approver fields
- **Tenant Isolation Gaps**: Different tenants seeing same data/caps/responses

---

## Integration with ATLAS-GATE Governance

### How to Use This Taxonomy

1. **Pre-Commit Audit**: Run static analysis against code changes; check for C1-C8 signals
2. **Plan Enforcement**: Plans must explicitly authorize expected constructs (if any are legitimate)
3. **Code Review Checklist**: Use cross-cutting signals to train reviewers
4. **Incident Investigation**: When production bypasses suspected, search for taxonomy patterns in audit logs + code

### Governance Markers

Legitimate uses of C1-C8 should be:
- **Explicitly documented** in plan files
- **Guarded by environment/feature gates** (not default-enabled)
- **Covered by tests** asserting behavior is not in prod paths
- **Audited** with immutable event logs when permissions granted
- **Reviewed** by domain experts (security, finance, ops)

### Failure Modes

Shipping C1-C8 without governance oversight leads to:
- **Data leakage** (C1, C2, C5: demo data, open access)
- **Financial loss** (C4, C7, C8: fake charges, missing enforcement)
- **Compliance violations** (C6, C7: bypassed approvals, skipped audits)
- **Operational chaos** (C3, C8: silent failures, masked errors)

---

## Version

- **Created**: Jan 2026
- **Status**: Canonical audit specification for ATLAS-GATE MCP v2.0
- **Updates**: Append construct examples; never remove existing signals (for backward compatibility with audit logs)
