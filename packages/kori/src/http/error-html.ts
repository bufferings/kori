import { encode } from 'entities';

type ErrorType =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'TIMEOUT'
  | 'INTERNAL_SERVER_ERROR';

/**
 * Generate HTML error page for error responses
 */
export function createErrorHtmlPage(options: { errorType: ErrorType; message: string }): string {
  const { errorType, message } = options;

  const statusText = getStatusText(errorType);
  const statusCode = getStatusCode(errorType);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${statusCode} ${statusText}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #e74c3c;
            margin: 0 0 20px 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .status-code {
            font-size: 0.8em;
            color: #666;
            margin-bottom: 20px;
        }
        .message {
            font-size: 1.1em;
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-left: 4px solid #e74c3c;
            border-radius: 4px;
        }
        .footer {
            font-size: 0.9em;
            color: #666;
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${statusText}</h1>
        <div class="status-code">HTTP ${statusCode}</div>
        <div class="message">${encode(message)}</div>
        <div class="footer">
            Please check your request and try again.
        </div>
    </div>
</body>
</html>`;
}

function getStatusText(errorType: ErrorType): string {
  switch (errorType) {
    case 'BAD_REQUEST':
      return 'Bad Request';
    case 'UNAUTHORIZED':
      return 'Unauthorized';
    case 'FORBIDDEN':
      return 'Forbidden';
    case 'NOT_FOUND':
      return 'Not Found';
    case 'METHOD_NOT_ALLOWED':
      return 'Method Not Allowed';
    case 'UNSUPPORTED_MEDIA_TYPE':
      return 'Unsupported Media Type';
    case 'TIMEOUT':
      return 'Request Timeout';
    case 'INTERNAL_SERVER_ERROR':
      return 'Internal Server Error';
  }
}

function getStatusCode(errorType: ErrorType): number {
  switch (errorType) {
    case 'BAD_REQUEST':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'METHOD_NOT_ALLOWED':
      return 405;
    case 'UNSUPPORTED_MEDIA_TYPE':
      return 415;
    case 'TIMEOUT':
      return 408;
    case 'INTERNAL_SERVER_ERROR':
      return 500;
  }
}
