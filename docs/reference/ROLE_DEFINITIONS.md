# ROLE DEFINITIONS (AUTHORITATIVE)

Everything must have exactly one role.

## 1. EXECUTABLE

**Description**: Active logic that runs, processes, or executes.
**Required Fields**:

- `ROLE`: EXECUTABLE
- `CONNECTED VIA`: How is this triggered? (e.g. "Import", "CLI", "HTTP")
- `PURPOSE`: What does this do?
- `FAILURE MODES`: How can this break?

## 2. BOUNDARY

**Description**: Interfaces, Types, Constants, or Schema definitions used by other components.
**Required Fields**:

- `ROLE`: BOUNDARY
- `USED BY`: Who uses this?
- `PURPOSE`: What does this define?
**Forbidden**:
- `CONNECTED VIA` (Boundaries are passive)

## 3. INFRASTRUCTURE

**Description**: core system components, registries, or foundational services.
**Required Fields**:

- `ROLE`: INFRASTRUCTURE
- `REGISTERED IN`: Where is this registered? (e.g. "Server", "Container")
- `PURPOSE`: What does this provide?
- `FAILURE MODES`: System level failures.

## 4. VERIFICATION

**Description**: Tests, Auditors, or Validation scripts.
**Required Fields**:

- `ROLE`: VERIFICATION
- `EXECUTED VIA`: How is this run? (e.g. "npm test", "CLI")
- `PURPOSE`: What does this verify?
