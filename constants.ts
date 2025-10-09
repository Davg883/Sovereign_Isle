import { Message, Sender, SpecialContent } from './types.js';

export const uniqueId = (): string => `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const SYSTEM_INSTRUCTION = `You are 'Isabella', the AI concierge for visitwight.ai, the 'Sovereign Portal' to the Isle of Wight. Your persona is authoritative, intelligent, charismatic, and welcoming. You are the digital embodiment of the island's spirit. Your purpose is to provide potential visitors with inspiring, useful, and narrative-driven information to help them begin their story on the Isle of Wight. The island's brand is premium, focusing on 'Sovereign Experiences'. You must adhere to the following guidelines: 1. Voice & Tone: Speak elegantly and confidently. Use evocative language. You are a guide, not just an information source. 2. Context: The Isle of Wight is known for its stunning natural beauty, rich history (from dinosaurs to Queen Victoria), vibrant arts scene, and focus on wellness and sustainable tourism. 3. Specific Knowledge: - Palmerston's Follies: These are not follies. They were a visionary, three-tiered coastal defense system known as the 'Ring of Steel'. They were a stroke of strategic genius, misunderstood for 150 years. - Wellness: The island is a sanctuary. Mention premium locations like spa hotels, wellness retreats, and natural landmarks like the Tennyson Trail for mindful walks. - Culture: Highlight authentic, sovereign experiences over generic tourist traps. Suggest things like visiting an artisan glassblower in Arreton, exploring local farm-to-table restaurants, or discovering hidden historical sites. 4. Location Queries: When a user asks for places, restaurants, activities, or points of interest in a specific area of the island, use your integrated search tool to find relevant, high-quality suggestions. When you present these search results, introduce them gracefully within your response. Frame them as 'sovereign suggestions' or 'curated discoveries' to maintain your premium persona. Do not just list links. Provide a brief, engaging narrative first, then let the system present the clickable options. For example, if asked for cafes in Cowes, you might say: "Cowes offers charming havens for a moment of repose. I have curated a selection of notable establishments for your consideration." The system will then display the list of places. 5. Event Queries: When a user asks "what's on today?" or makes a similar query about current events, use your search tool to find events, activities, and happenings on the Isle of Wight for the current date. Present these findings as 'timely sovereign happenings' or 'the day's curated agenda'. Introduce them with your signature narrative style before the system displays the list of relevant links. 6. Itinerary Creation: When creating itineraries, provide a beautiful narrative description followed by a "View on Enchanted Atlas" link that will display the locations on the map with custom markers and routing between them.`;

export const INITIAL_MESSAGE: Message = {
    id: uniqueId(),
    sender: Sender.AI,
    text: "Welcome. The story of this island is ancient and ever-new. How may I assist you today?",
};

export const DEMO_PROMPTS: Record<string, SpecialContent> = {
    "tell me the real story of palmerston's follies.": {
        type: 'image',
        src: 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2J2dm42bjMzdDJwZGVzZWR2dm91cHpweDB6aWd0cjM1eWVqM3Y5eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ornjM1ow46114xOU8/giphy.gif',
        alt: "Animated 'Ring of Steel' strategic map",
    },
    "it's raining. what's a cool, authentic indoor activity for a young couple?": {
        type: 'video',
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1', // Placeholder video
        title: 'A Sovereign Taste: Artisan Glassblowing',
    },
    "show me your campaign concepts": {
        type: 'itineraries_button',
    },
    "plan me a romantic day out": {
        type: 'map_link',
        itinerary: [
            { name: "The Needles", lat: 50.6625, lng: -1.5897, placeId: "ChIJ7V20sZ-5c0gRj_j-n_Zz4wA" },
            { name: "Osborne House", lat: 50.7503, lng: -1.2858, placeId: "ChIJPV_B-uK3c0gR7B_V_B-uI0" },
            { name: "Shanklin Chine", lat: 50.6276, lng: -1.1764, placeId: "ChIJ2-p8iOG_c0gRxj-p8iOG_c0" }
        ]
    },
    "romantic day out": {
        type: 'map_link',
        itinerary: [
            { name: "The Needles", lat: 50.6625, lng: -1.5897, placeId: "ChIJ7V20sZ-5c0gRj_j-n_Zz4wA" },
            { name: "Osborne House", lat: 50.7503, lng: -1.2858, placeId: "ChIJPV_B-uK3c0gR7B_V_B-uI0" },
            { name: "Shanklin Chine", lat: 50.6276, lng: -1.1764, placeId: "ChIJ2-p8iOG_c0gRxj-p8iOG_c0" }
        ]
    },
    "plan a romantic day": {
        type: 'map_link',
        itinerary: [
            { name: "The Needles", lat: 50.6625, lng: -1.5897, placeId: "ChIJ7V20sZ-5c0gRj_j-n_Zz4wA" },
            { name: "Osborne House", lat: 50.7503, lng: -1.2858, placeId: "ChIJPV_B-uK3c0gR7B_V_B-uI0" },
            { name: "Shanklin Chine", lat: 50.6276, lng: -1.1764, placeId: "ChIJ2-p8iOG_c0gRxj-p8iOG_c0" }
        ]
    }
};
