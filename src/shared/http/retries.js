export const MAX_ATTEMPTS = 4;

export function getDelay(attempt) {
  return 1000 * Math.pow(2, attempt);
};

export async function wait(ms, onTick = null) {
  return new Promise(resolve => {
    if (!onTick) {
      setTimeout(resolve, ms);
      return;
    };

    let remaining = Math.ceil(ms / 1000);
    onTick(remaining);

    const interval = setInterval(() => {
      remaining--;
      onTick(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        resolve();
      };
    }, 1000);
  });
};
