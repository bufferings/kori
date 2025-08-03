---
'@korix/kori': patch
'@korix/body-limit-plugin': patch
'@korix/cors-plugin': patch
---

Remove response abort functionality and simplify hook return mechanism

This change eliminates the complex abort pattern in favor of direct response returns from hooks, making the API more intuitive and reducing cognitive overhead for developers. Hooks can now return KoriResponse directly for early termination instead of using the abort mechanism.
