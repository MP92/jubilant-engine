declare module 'run-queue' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Task = (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Args = any[];

  interface QueueOptions {
    /**
     * Maximum number of concurrent tasks to run
     * @default 1
     */
    maxConcurrency?: number;
    /**
     * Promise implementation to use
     * @default global.Promise
     */
    Promise?: PromiseConstructor;
  }

  interface QueueTask {
    cmd: Task;
    args?: Args;
  }

  declare class RunQueue {
    /**
     * Creates a new RunQueue instance
     * @param opts Configuration options
     */
    constructor(opts?: QueueOptions);

    /**
     * Whether the queue has finished processing
     */
    finished: boolean;

    /**
     * Number of currently running tasks
     */
    inflight: number;

    /**
     * Maximum number of concurrent tasks
     */
    maxConcurrency: number;

    /**
     * Number of tasks waiting in the queue
     */
    queued: number;

    /**
     * Internal queue structure
     */
    queue: { [priority: number]: QueueTask[] };

    /**
     * Current priority being processed
     */
    currentPrio: number | null;

    /**
     * Current queue being processed
     */
    currentQueue: QueueTask[] | null;

    /**
     * Promise implementation being used
     */
    Promise: PromiseConstructor;

    /**
     * Internal deferred object
     */
    deferred: {
      promise?: Promise<void>;
      resolve?: () => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reject?: (error: any) => void;
    };

    /**
     * Starts processing the queue
     * @returns A promise that resolves when all tasks complete or rejects if any task fails
     * @throws {Error} If arguments are provided
     */
    run(): Promise<void>;

    /**
     * Adds a task to the queue
     * @param prio Priority level (positive integer)
     * @param cmd Function to execute
     * @param args Arguments to pass to the function
     * @throws {Error} If queue is finished, priority is invalid, or arguments are invalid
     */
    add(prio: number, cmd: Task, args?: Args): void;
  }

  export = RunQueue;
}
