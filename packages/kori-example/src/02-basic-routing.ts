import { createKori } from 'kori';

const app = createKori();

app.get('/', (ctx) => ctx.res.json({ message: 'Hello, Kori!' }));

app.get('/hello/:name', (ctx) => {
  const name = ctx.req.pathParams.name;
  return ctx.res.json({ message: `Hello, ${name}!` });
});

app.get('/users', (ctx) => {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ];
  return ctx.res.json(users);
});

app.post('/users', async (ctx) => {
  const body = await ctx.req.json();
  return ctx.res.status(201).json({ message: 'User created', user: body });
});

app.put('/users/:id', async (ctx) => {
  const id = ctx.req.pathParams.id;
  const body = await ctx.req.json();
  return ctx.res.json({ message: `User ${id} updated`, user: body });
});

app.delete('/users/:id', (ctx) => {
  const id = ctx.req.pathParams.id;
  return ctx.res.json({ message: `User ${id} deleted` });
});

app.get('/query', (ctx) => {
  const query = ctx.req.queryParams;
  return ctx.res.json({ query });
});

app.get('/headers', (ctx) => {
  const userAgent = ctx.req.headers['user-agent'];
  const customHeader = ctx.req.headers['x-custom-header'];
  return ctx.res.json({ userAgent, customHeader });
});

app.get('/text', (ctx) => ctx.res.text('This is a plain text response'));

app.get('/html', (ctx) => ctx.res.html('<h1>Hello from Kori!</h1>'));

app.get('/empty', (ctx) => ctx.res.empty(204));

app.get('/status', (ctx) => ctx.res.status(418).json({ message: "I'm a teapot" }));

app.addRoute({
  method: 'GET',
  path: '/alternative',
  handler: (ctx) => {
    return ctx.res.json({
      message: 'This route uses addRoute instead of method aliases',
      note: 'Both app.get() and app.addRoute() are valid approaches',
    });
  },
});

app.onError((ctx, _err) => {
  if (!ctx.res.isSet()) {
    ctx.res.notFound({ message: 'Route not found' });
  }
});

export default app;
