import { start } from './app.js';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
async function main() {
    try {
        await start(PORT);
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down WorldHost server...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down WorldHost server...');
    process.exit(0);
});
main().catch(console.error);
//# sourceMappingURL=index.js.map