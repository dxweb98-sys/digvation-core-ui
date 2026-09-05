# Versioning Standard

Digvation Control Center is independently deployable and uses semantic
versioning with prerelease identifiers.

| Lifecycle | Format | Example |
| --- | --- | --- |
| Development | `0.x.x-alpha.N` | `0.1.0-alpha.0` |
| Review candidate | `0.x.x-rc.N` | `0.1.0-rc.0` |
| Stable release | `0.x.x` | `0.1.0` |

The application starts at `0.1.0-alpha.0`. Versions change only at coherent,
accepted checkpoint or release boundaries—not for every edit. Keep the version
in `package.json`; any additional visible version source must derive from it or
be updated in the same accepted version change.

Do not create a release, tag, or stable version without explicit approval.
