import { Client, Account, Databases, Storage, Query } from 'appwrite';

const client = new Client();

client
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('69cda978001070a4493b'); // ✅ Your Project ID

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// This line was missing Query, bro!
export { ID, Query } from 'appwrite';