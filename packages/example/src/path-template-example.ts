import { createKori } from '@korix/kori';

const app = createKori();

app.get('/', (ctx) => {
  return ctx.res.text(`Template: ${ctx.req.pathTemplate()}`);
});

app.get('/users/:id', (ctx) => {
  return ctx.res.json({
    template: ctx.req.pathTemplate(),
    params: ctx.req.pathParams(),
    message: `User ${ctx.req.pathParams().id}`,
  });
});

app.get('/users/:id/posts/:postId', (ctx) => {
  return ctx.res.json({
    template: ctx.req.pathTemplate(),
    params: ctx.req.pathParams(),
    message: `Post ${ctx.req.pathParams().postId} by user ${ctx.req.pathParams().id}`,
  });
});

// For testing purposes
export default app;

// Example usage:
// GET / -> { template: "/" }
// GET /users/123 -> { template: "/users/:id", params: { id: "123" } }
// GET /users/123/posts/456 -> { template: "/users/:id/posts/:postId", params: { id: "123", postId: "456" } }
