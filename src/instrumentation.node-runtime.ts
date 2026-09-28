// Next's runtime-specific instrumentation pattern loads this module with
// require() from instrumentation.ts. Keep startup as a module side effect so
// the Node helper does not need a named `register` export across the Netlify
// function bundle boundary.
import { register } from "./instrumentation.node";

register();
