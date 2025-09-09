class WebSocketStreamImpl {
  #ws;
  #readableController;
  #writableController;
  #readable;
  #writable;
  #handleCloseEvent;
  #closedPromise = Promise.withResolvers();
  #openedPromise = Promise.withResolvers();
  opened;
  closed;
  url;
  signal;
  protocols = [];
  constructor(url, options = {}) {
    try {
      this.url = url;
      if (options?.protocols) {
        this.protocols = options.protocols;
      }
      if (options?.signal) {
        this.signal = options.signal;
        this.signal.addEventListener("abort", async (e) => {
          try {
            this.#closedPromise.reject(new DOMException("WebSocket handshake was aborted", "ABORT_ERR"));
            this.#openedPromise.reject(new DOMException("WebSocket handshake was aborted", "ABORT_ERR"));
          } catch (e2) {
            console.log(e2);
          }
        });
      }
      this.#openedPromise.promise.catch(() => {});
      this.#closedPromise.promise.catch(() => {});
      this.closed = this.#closedPromise.promise.catch((e) => {
        throw e;
      });
      this.opened = new Promise(async (resolve, reject) => {
        try {
          const aborted = this.signal?.aborted;
          if (aborted) {
            return reject(this.#openedPromise);
          }
        } catch {
          return;
        }
        const args = [url, { protocols: this.protocols }];
        if (this.protocols.length === 0) {
          args.pop();
        }
        this.#handleCloseEvent = function handleCloseEvent(e) {
          const { code, reason } = e;
          try {
            if (this.#readable.locked) {
              this.#readableController.close();
            }
            if (this.#writable.locked) {
              this.#writable.close().catch(() => {});
            }
            this.#closedPromise.resolve({ closeCode: code, reason });
          } catch (e2) {}
        };
        this.#ws = new WebSocket(...args);
        this.#ws.binaryType = "arraybuffer";
        this.#ws.addEventListener("close", this.#handleCloseEvent.bind(this));
        this.#ws.addEventListener("error", (e) => {
          this.#closedPromise.reject(e);
        }, { once: true });
        this.#ws.addEventListener("message", (e) => {
          this.#readableController.enqueue(e.data);
        });
        this.#ws.addEventListener("open", (e) => {
          this.#readable = new ReadableStream({
            start: (c) => {
              this.#readableController = c;
            },
            cancel: async (reason) => {
              console.log(reason);
              await this.#writable.close();
            }
          });
          this.#writable = new WritableStream({
            start: (c) => {
              this.#writableController = c;
            },
            write: (value) => {
              this.#ws.send(value);
            },
            close: () => {
              console.log("close");
              this.#readableController.close();
              this.#ws.close();
            },
            abort: (reason) => {}
          });
          resolve({
            readable: this.#readable,
            writable: this.#writable
          });
        });
      }).catch((e) => {
        throw e;
      });
    } catch (e) {
      throw e;
    }
  }
  close({ closeCode = 1000, reason = "" } = {}) {
    if (navigator.userAgent.includes("Node")) {
      this.#handleCloseEvent({ code: closeCode, reason });
    } else {
      this.#ws.close(closeCode, reason);
    }
  }
}

export { WebSocketStreamImpl }
