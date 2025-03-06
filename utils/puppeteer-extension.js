const waitForCondition = async (page, options) => {
  const { timeout = 10000, interval = 250, ...restOptions } = options;
  
  return page.evaluate(async (params) => {
    return await new Promise((resolve, reject) => {
      const start = Date.now();
      let timeoutId;

      const check = () => {
        const el = document.querySelector(params.selector);
        if (!el) return;
        
        if (params.expectedText) {
          // Check for text match
          if (el.textContent.includes(params.expectedText)) {
            clearTimeout(timeoutId);
            resolve();
            return;
          }
        } else if (params.expectedStyles) {
          // Check for display: none
          const style = window.getComputedStyle(el);
          const allStylesMatch = Object.entries(params.expectedStyles)
            .every(([property, value]) => style[property] === value);

          if (allStylesMatch) {
            clearTimeout(timeoutId);
            resolve();
            return;
          }
        }
        
        if (Date.now() - start >= params.timeout) {
          clearTimeout(timeoutId);
          reject(`Timeout: Condition not met within ${params.timeout}ms`);
          return;
        }

        timeoutId = setTimeout(check, params.interval);
      };

      check();
    });
  }, { ...restOptions, timeout, interval });
};

module.exports = { waitForCondition };