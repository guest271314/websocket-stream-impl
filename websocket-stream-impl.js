class WebSocketStreamImpl {
  #ws;
  #readableController;
  #writableController;
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
            this.#closedPromise.reject(
              new DOMException("WebSocket handshake was aborted", "ABORT_ERR"),
            );
            this.#openedPromise.reject(
              new DOMException("WebSocket handshake was aborted", "ABORT_ERR"),
            );
          } catch {
          }
        });
      }
      this.#openedPromise.promise.catch(() => {});
      this.closed = this.#closedPromise.promise;
      this.opened = new Promise((r) => {
        setTimeout(r, 1);
      }).then(() =>
        new Promise(async (resolve, reject) => {
          try {
            const aborted = this.signal?.aborted;
            if (aborted) {
              throw null;
            }
          } catch {
            this.#openedPromise.promise.catch((e) => reject(e));
            return;
          }
          // For Deno, throws when protocols is empty Array []
          const args = [url, { protocols: this.protocols }];
          if (this.protocols.length === 0) {
            args.pop();
          }
          this.handleCloseEvent = (e) => {
            const { code, reason } = e;
            console.log("close event", e);
            try {
              if (this.readable.locked) {
                this.#readableController.close();
              }
              if (this.writable.locked) {
                this.writable.close().catch(() => {});
              }
              this.#openedPromise.resolve({
                readable: this.readable,
                writable: this.writable,
              });
              this.#closedPromise.resolve({ closeCode: code, reason });
            } catch (e) {
            }
          };
          this.#ws = new WebSocket(...args);
          this.#ws.binaryType = "arraybuffer";
          this.#ws.addEventListener("close", this.handleCloseEvent);
          this.#ws.addEventListener("error", (e) => {
            this.#closedPromise.reject(e);
          }, { once: true });
          this.#ws.addEventListener("message", (e) => {
            this.#readableController.enqueue(e.data);
          });
          this.#ws.addEventListener("open", (e) => {
            this.readable = new ReadableStream({
              start: (c) => {
                this.#readableController = c;
              },
              cancel: async (reason) => {
                await this.writer.close();
              },
            }, { once: true });
            this.writable = new WritableStream({
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
              abort: (reason) => {
              },
            });

            resolve({
              readable: this.readable,
              writable: this.writable,
            });
          });
        }).catch((e) => {
          throw e;
        })
      );
    } catch (e) {
      throw e;
    }
  }
  close({ code = 1000, reason = "" } = {}) {
    // Node.js client doesn't automatically close connection
    if (navigator.userAgent.includes("Node")) {
      new Promise((r) => {
        setTimeout(r, 50);     
      }).then(() => this.handleCloseEvent({ code: 1000, reason: "Done streaming" }));
    }
    console.log(this.#ws.readyState);
    new Promise((r) => {
      setTimeout(r, 50);
    }).then(() => this.#ws.close(code, reason));
  }
}

export { WebSocketStreamImpl }
