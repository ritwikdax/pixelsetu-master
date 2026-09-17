import z from 'zod';

export const LoginPayloadSchema = z.object({
  phone: z
    .string()
    .length(10)
    .regex(/^[0-9]+$/),
  password: z
    .string()
    .length(10)
    .regex(/^[a-zA-Z0-9]+$/),
});
