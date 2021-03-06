import Rx, {Observable as O} from "rxjs"

function RxJSObs(obs, shared) {
  this.o = obs
  this.shared = shared || false
}

function RxJSBus() {
  this.s = new Rx.Subject()
}

Object.assign(RxJSObs.prototype, {
  get(multicast) {
    return multicast === false ? this.o : this.o.share()
  },
  getp() {
    return this.o.publishReplay(1).refCount()
  },
  multicast() {
    return new RxJSObs(this.shared ? this.o : this.o.share(), true)
  },
  map(fn) {
    return new RxJSObs(this.o.map(fn))
  },
  tap(fn) {
    return new RxJSObs(this.o.do(fn))
  },
  filter(fn) {
    return new RxJSObs(this.o.filter(fn))
  },
  doOnCompleted(fn) {
    return new RxJSObs(this.o.doOnCompleted(fn))
  },
  scan(fn, seed) {
    return new RxJSObs(this.o.startWith(seed).scan(fn))
  },
  flatMap(fn) {
    return new RxJSObs(this.o.flatMap(x => fn(x).get(false)))
  },
  flatMapLatest(fn) {
    return new RxJSObs(this.o.switchMap(x => fn(x).get(false)))
  },
  skipDuplicates(eq) {
    return new RxJSObs(eq ? this.o.distinctUntilChanged(eq) : this.o.distinctUntilChanged())
  },
  hot(toProp) {
    const obs = toProp ? this.o.publishReplay(1) : this.o.publish()
    const subscription = obs.connect()
    const dispose = () => subscription.unsubscribe()
    return [new RxJSObs(obs, toProp), dispose]
  },
  subscribe({next, error, completed: complete}) {
    const subscription = this.o.subscribe({next, error, complete})
    return () => subscription.unsubscribe()
  }
})

Object.assign(RxJSBus.prototype, {
  obs() {
    return new RxJSObs(this.s ? this.s.asObservable() : O.empty())
  },
  next(val) {
    this.s && this.s.next(val)
  },
  completed() {
    if (this.s) {
      const s = this.s
      this.s = void 0
      s.complete()
      s.unsubscribe()
    }
  },
  error(err) {
    if (this.s) {
      const s = this.s
      this.s = void 0
      s.error(err)
      s.unsubscribe()
    }
  }
})


Object.assign(RxJSObs, {
  is(obs) {
    // TODO: better way to detect this?
    return obs && typeof obs.subscribe === "function"
  },
  create(fn) {
    return new RxJSObs(O.create(o => {
      return fn(toObserver(o))
    }))
  },
  just(val) {
    return new RxJSObs(O.of(val))
  },
  never() {
    return new RxJSObs(O.never())
  },
  empty() {
    return new RxJSObs(O.empty())
  },
  error(err) {
    return new RxJSObs(O.throw(err))
  },
  combine(list) {
    return new RxJSObs(list.length === 0 ? O.just([]) : O.combineLatest(...list.map(o => o.get(false))))
  },
  merge(obs) {
    return new RxJSObs(O.merge(...obs.map(o => o.get(false))))
  },
  subscriptionToDispose(subsciption) {
    return () => subsciption.unsubscribe()
  },
  disposeToSubscription(dispose) {
    return {unsubscribe: dispose}
  },
  disposeMany(disposes) {
    let disposed = false
    return () => {
      if (disposed) return
      disposed = true
      disposes.forEach(d => d())
      disposes = null
    }
  },
  bus() {
    return new RxJSBus()
  }
})

function toObserver(o) {
  return {
    next: val => o.next(val),
    completed: () => o.complete(),
    error: err => o.error(err)
  }
}


Rx.TSERS = RxJSObs
module.exports = Rx
