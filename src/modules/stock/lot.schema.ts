import z from 'zod';

export const LotSchema = z
  .object({
    symbol: z.string(),
    buyPrice: z.number().nonnegative(),
    sellPrice: z.number().nonnegative(),
    quantity: z.number().int().nonnegative(),
    broker: z
      .enum(['zerodha', 'upstox', 'groww'])
      .default('zerodha')
      .optional(),
  })
  .strict();

export type Lot = z.infer<typeof LotSchema>;
