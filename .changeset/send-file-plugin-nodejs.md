---
'@korix/send-file-plugin-nodejs': patch
---

Add send-file-plugin-nodejs package for file sending with intuitive API

- New plugin with res.sendFile() method for easy file sending
- Simple API: res.sendFile(path) for inline display, res.sendFile(path, {download: true}) for downloads
- Type-safe options with discriminated union: {download?: boolean, filename?: string}
- Node.js specific implementation maintaining core package platform independence
