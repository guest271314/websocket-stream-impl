# websocket-stream-impl
JavaScript runtime agnostic `WebSocketStream` implementation.

# Usage

```
import { WebSocketStreamImpl } from "./websocket-stream-impl.js";
if (!Object.hasOwn(globalThis, "WebSocketStream")) {
  globalThis.WebSocketStream = WebSocketStreamImpl;
}
```

# References

- [WebSocketStream Explained](https://github.com/ricea/websocketstream-explainer)
- [WebSocketStream API design](https://docs.google.com/document/d/1La1ehXw76HP6n1uUeks-WJGFgAnpX2tCjKts7QFJ57Y/edit?pli=1&tab=t.0#heading=h.qyzhypmbt4hn)

# License
Do What the Fuck You Want to Public License [WTFPLv2](http://www.wtfpl.net/about/)
