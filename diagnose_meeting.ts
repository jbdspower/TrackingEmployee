
import mongoose from 'mongoose';
import { Meeting } from './server/models/Meeting';
import { format } from 'date-fns';

async function diagnose() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/employee-tracking";
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const meetings = await Meeting.find({ status: 'completed' }).sort({ updatedAt: -1 }).limit(5).lean();

        console.log(`Checking ${meetings.length} recent completed meetings:`);

        meetings.forEach(m => {
            const start = new Date(m.startTime);
            const end = m.endTime ? new Date(m.endTime) : new Date();
            const diffMs = end.getTime() - start.getTime();
            const diffHrs = diffMs / (1000 * 60 * 60);

            console.log(`Meeting ID: ${m._id}`);
            console.log(`  Client: ${m.clientName}`);
            console.log(`  StartTime: ${m.startTime}`);
            console.log(`  EndTime: ${m.endTime}`);
            console.log(`  Start (parsed): ${start.toISOString()}`);
            console.log(`  End (parsed): ${end.toISOString()}`);
            console.log(`  Duration (ms): ${diffMs}`);
            console.log(`  Duration (hrs): ${diffHrs}`);
            console.log(`  FormatHours test: ${Math.floor(diffHrs)}h ${Math.round((diffHrs - Math.floor(diffHrs)) * 60)}m`);
            console.log('---');
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

diagnose();
