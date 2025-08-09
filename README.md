## Thunder

The open source platform-as-a-service. Alternative to Heroku, Render and Vercel. Built on top of AWS.



### Set up Supabase

```env
SUPABASE_URL=https://
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=
DATABASE_URL="postgres://"
```

### Deploy the Supabase Functions

To deploy the Supabase functions, run the following command:

```sh
supabase functions deploy email-invite --no-verify-jwt
supabase functions deploy github-webhook --no-verify-jwt
supabase functions deploy polar-webhook --no-verify-jwt
```