import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const reactConfig = require("@vitera/eslint-config/react");

export default reactConfig;
