import { loadConfig } from '@crewspace/config';

const config = loadConfig();
console.log(`CrewSpace worker ready on Redis ${config.redisUrl}`);
