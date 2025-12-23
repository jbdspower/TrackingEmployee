
const mongoose = require('mongoose');

// Mock calculateMeetingDuration
function calculateMeetingDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    return durationMs / (1000 * 60 * 60); // Convert to hours
}

async function diagnose() {
    try {
        const MONGODB_URI = "mongodb://localhost:27017/employee-tracking";
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const collection = mongoose.connection.collection('meetings');
        const meetings = await collection.find({ status: 'completed' }).sort({ updatedAt: -1 }).limit(5).toArray();

        console.log(`Checking ${meetings.length} recent completed meetings:`);

        meetings.forEach(m => {
            const hrs = calculateMeetingDuration(m.startTime, m.endTime || null);
            const h = Math.floor(hrs);
            const m_val = Math.round((hrs - h) * 60);

            console.log(`Meeting ID: ${m._id}`);
            console.log(`  Client: ${m.clientName}`);
            console.log(`  StartTime: ${m.startTime}`);
            console.log(`  EndTime: ${m.endTime}`);
            console.log(`  Duration (hrs): ${hrs}`);
            console.log(`  Formatted: ${h}h ${m_val}m`);
            console.log('---');
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

diagnose();
