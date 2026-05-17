import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import { contactLimiter } from "../../middleware/rateLimiter";
import { v, schema } from "../../middleware/validate";
import type { Request, Response } from "express";

const router: IRouter = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const contactSchema = schema({
  name: v.string({ min: 1, max: 100, label: "Name" }),
  email: v.email({ label: "Email" }),
  message: v.string({ min: 1, max: 2000, label: "Message" }),
});

router.post("/", contactLimiter, async (req: Request, res: Response) => {
  const result = contactSchema(req.body);
  if (!result.ok) {
    return res.status(400).json({ success: false, errors: result.errors });
  }

  const { error } = await supabase.from("messages").insert({
    name: result.data.name,
    email: result.data.email,
    message: result.data.message,
    status: "unread",
    created_at: new Date().toISOString(),
  });

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

export default router;
