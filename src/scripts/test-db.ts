// Testing Script to Verify Database Connection and Model Schemas
import mongoose from 'mongoose';
import User from '../models/User';
import Post from '../models/Post';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables manually for script
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const uri = process.env.MONGODB_URI;

async function testDatabase() {
    if (!uri) {
        console.error('❌ MONGODB_URI not found in .env.local');
        process.exit(1);
    }

    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB Atlas successfully.');

        // 1. Create a Test User
        console.log('\n🔄 Creating test user...');

        // Clean up previous tests
        await User.deleteMany({ email: 'test.social@example.com' });

        const testUser = await User.create({
            name: 'Integration Tester',
            email: 'test.social@example.com',
            bio: 'I am a test user building a great app!',
            skills: ['Next.js', 'MongoDB', 'React'],
            followers: [],
            following: [],
        });
        console.log('✅ Created user:', testUser._id.toString());

        // 2. Create a Test Post
        console.log('\n🔄 Creating test post...');
        const testPost = await Post.create({
            author: testUser._id,
            content: 'This is my first post on this awesome new platform! 🚀',
            likes: [],
            comments: [
                {
                    user: testUser._id,
                    text: 'And this is a comment on my own post.',
                }
            ]
        });
        console.log('✅ Created post:', testPost._id.toString());

        // 3. Fetch Feed with Population
        console.log('\n🔄 Fetching global feed...');
        const feed = await Post.find({})
            .populate('author', 'name bio') // Check relationship works
            .sort({ createdAt: -1 })
            .limit(1);

        if (feed.length > 0 && feed[0].author) {
            console.log('✅ Successfully fetched feed and populated author details:');
            console.log(`   Author Name: ${(feed[0].author as any).name}`);
            console.log(`   Content: ${feed[0].content}`);
        } else {
            console.log('❌ Failed to populate author details.');
        }

        console.log('\n🎉 All database tests passed successfully!');

    } catch (error) {
        console.error('\n❌ Database test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB.');
        process.exit(0);
    }
}

testDatabase();
