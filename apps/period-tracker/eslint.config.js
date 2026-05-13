import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const reactConfig = require("@repo/eslint-config/react");

export default reactConfig;
