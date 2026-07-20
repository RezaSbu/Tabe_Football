class AsyncLock {
  private promise: Promise<any> = Promise.resolve();

  acquire<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.promise.then(() => fn());
    this.promise = next.then(
      () => {},
      () => {}
    );
    return next;
  }
}

const dbLock = new AsyncLock();

export { AsyncLock, dbLock };
