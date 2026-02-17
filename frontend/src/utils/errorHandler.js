// errorHandler.js
// This suppresses ResizeObserver errors globally

const originalConsoleError = console.error;

console.error = (...args) => {
    // Check if the error is a ResizeObserver error
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('ResizeObserver') || 
         args[0].includes('ResizeObserver loop'))) {
        // Suppress the error
        return;
    }
    
    // Pass through all other errors
    originalConsoleError.apply(console, args);
};

// Also suppress unhandled promise rejections related to ResizeObserver
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && 
        (event.reason.message?.includes('ResizeObserver') ||
         event.reason?.includes('ResizeObserver'))) {
        event.preventDefault();
        return;
    }
});

export default {};