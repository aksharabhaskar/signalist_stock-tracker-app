'use server'
import {connectToDatabase} from "@/database/mongoose";

export const getAllUsersForNewsEmail = async() => {
    try{
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if(!db) throw new Error('Database not connected')

        // First, let's see what we actually get
        const allUsers = await db.collection('users').find({}).toArray();
        console.log('ALL USERS (no filter):', JSON.stringify(allUsers, null, 2));

        const users = await db.collection('users').find(
            {email: {$exists: true, $ne: null}},
            {projection: {_id: 1, id:1, name:1, email: 1, country:1}}
        ).toArray();

        console.log('FILTERED USERS:', JSON.stringify(users, null, 2));

        return users.filter(user => user.email && user.name).map(user => ({
            id: user.id || user._id?.toString() || '',
            email: user.email,
            name: user.name
        }));
    }catch(e){
        console.error('Error fetching users for news email:',e)
        return []
    }
}