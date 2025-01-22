import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

export const storage = new Storage()

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  if (req.body && req.body.callbackName === "setStorage") {
    storage
      .set(req.body.key, req.body.value)
      .then(() => res.send({ message: req.body.value }))
  }
  if (req.body && req.body.callbackName === "getStorage") {
    const value = await storage.get(req.body.key)
    res.send({ message: value })
  }
}

export default handler
