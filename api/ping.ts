export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, msg: "pong", time: new Date().toISOString() });
}
