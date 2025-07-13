// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
Deno.serve(async (req)=>{
  const { to, subject, html } = await req.json();
  console.log("to: ", to);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'no-reply@ping.thunder.so',
      to,
      subject,
      html
    })
  });
  const data = await res.json();
  console.log("data: ", data);
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
});
