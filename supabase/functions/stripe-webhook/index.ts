import { createPayments } from '../_shared/payments.mjs';
Deno.serve(createPayments({ env: (name: string) => Deno.env.get(name) }).webhook);
