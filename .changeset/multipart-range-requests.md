---
'@korix/static-file-plugin-nodejs': minor
---

Add multipart range request support for HTTP 206 Partial Content

- Implement multipart/byteranges response format for multiple ranges
- Add maxRanges configuration option to limit simultaneous ranges
- Support industry-standard range request formats (bytes=0-999,5000-5999)
- Include comprehensive test coverage for multipart scenarios
- Update documentation with multipart range examples and configuration
