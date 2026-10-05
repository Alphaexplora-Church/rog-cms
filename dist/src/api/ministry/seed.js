"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedMinistries = seedMinistries;
const SEED = [
    {
        "ministryType": "ages",
        "name": "River Kids",
        "ages": "3–12",
        "description": "An entry-level experience for kids — games, Bible stories, interactive learning, and lots of fun."
    },
    {
        "ministryType": "ages",
        "name": "River Youth",
        "ages": "13–19",
        "description": "Helps young believers \"cross over\" to adulthood by elevating faith, character, and maturity."
    },
    {
        "ministryType": "ages",
        "name": "Young Adults",
        "ages": "20–35",
        "description": "Builds fellowship around career, finances, personal growth, and relationships."
    },
    {
        "ministryType": "ages",
        "name": "River Men & Women",
        "ages": "36–50",
        "description": "Helps men and women mature further in their walk with Christ."
    },
    {
        "ministryType": "ages",
        "name": "Seasoned",
        "ages": "51+",
        "description": "The same maturity focus, for our seasoned believers."
    },
    {
        "ministryType": "ages",
        "name": "Family Ministry",
        "ages": "Married couples",
        "description": "Helps married couples foster families consecrated to the Lord."
    },
    {
        "ministryType": "service",
        "name": "Ushering",
        "description": "The Ushering Ministry is driven by their vision \"to love God and serve His people\". Their mission to keep and maintain order and security in the church is one way they do to serve the purpose. Differences in the strength of each member keeps the ministry balanced. The increasing passion in the hearts of people across all ages to serve through this ministry has been one of their core strength.",
        "quote": "If you love God and it's your desire to serve His people, this may be an open door for you to serve Jesus.",
        "contactName": "Erika Garcia",
        "contactNumber": "09338112473",
        "hashtags": "#Ushering"
    },
    {
        "ministryType": "service",
        "name": "Media and Production",
        "description": "We support ministries in communicating their message through quality presentations, graphic design, photography, videography, and live broadcast, while social media is our primary method for making noise. Our purpose is to relay God's message in today's high-tech society, in this creative and innovative generation. The team is also responsible for communicating updates, information, and changes to the ROG Community through the creation of online collaterals and other related documents.",
        "quote": "If you're praying for God to use your creative talents, this may be an open door for you to serve Jesus.",
        "contactName": "Joy Mallari",
        "contactNumber": "09972249914",
        "hashtags": "#MediaProduction #RMP #MediaforJesus"
    },
    {
        "ministryType": "service",
        "name": "Creative Arts",
        "description": "The Creative Arts Ministry of River of God has three divisions namely FIRESTARTERS (dance and banner), VISIONCASTERS (prophetic painting), and TRAILBLAZERS (performing arts). To love God and disciple His people through arts is the main thrust of this ministry. Our mission is to evangelize the lost through arts and establish them in the Christian faith, to usher God’s people in worship, and equip them to enhance their artistic skills and empower them to equip others.",
        "quote": "ROG's serving ministries are in need of committed and available volunteers!",
        "contactName": "Jieyan Antonio",
        "contactNumber": "09947498070",
        "hashtags": "#CreativeArts"
    },
    {
        "ministryType": "service",
        "name": "Worship Team",
        "description": "More than just a team, the River Worship is a family dedicated to honor and serve God using our skills and talents through music. Our aim is to usher people to spirit-led worship and minister to their thirst for God’s presence through prophetic worship. Our mission is to awaken and equip the hearts of worshippers, for we long to see the Body of Christ worshipping the Father in Spirit and in Truth.",
        "quote": "Praying to serve in the Worship Team?",
        "contactName": "Olga Lomuntad",
        "contactNumber": "0928487771",
        "hashtags": "#RiverWorship"
    },
    {
        "ministryType": "service",
        "name": "River Kids Teachers",
        "description": "River Kids Ministry is a place where fun meets faith. We believe that every moment — from games and laughter to lessons and prayer — can lead a child closer to Jesus. Our heart is to guide children from simple playtime to discovering their God-given purpose. Through Bible-based teaching, creative activities, worship, and meaningful relationships, we help kids grow in character, confidence, and Christ.",
        "quote": "From playtime to purpose, walk with River Kids as they learn to follow Jesus wholeheartedly.",
        "contactName": "Aprile Liwanag",
        "contactNumber": "09178320417",
        "hashtags": "#RiverKidsTeachers"
    },
    {
        "ministryType": "service",
        "name": "River Families",
        "description": "River Families Ministry is a vibrant community that embraces every stage of family life. At its core are five life stages — River Kids, River Youth, Young Adults, Adults, and Seasoned — each representing a unique season of growth and discipleship. Together, these layers form a loving and connected ministry where every person and every family can belong, be supported, and thrive in faith within the community.",
        "quote": "If you have a heart to walk alongside families, mentor the next generation, or help create spaces where every life stage can grow in Christ, this may be your opportunity to serve.",
        "contactName": "Nestor and Sol Mendoza",
        "contactNumber": "09176510919",
        "hashtags": "#RiverFamilies"
    },
    {
        "ministryType": "service",
        "name": "Discipleship",
        "description": "Loving God and making disciples are essential to the vision of the Discipleship Team. We aim to equip and empower people to do the great commission. Our mission is to help VIPs and ROG members to grow in their relationship with God by connecting them to the River of God Spiritual Family, and eventually getting them into discipleship. Our aim is to encourage leaders to raise more leaders who are in love with God and are passionate in making disciples.",
        "quote": "If you love God and you have a heart to make disciples, then this may be an open door for you to serve Jesus.",
        "contactName": "Carissa Traigo",
        "contactNumber": "09171163975",
        "hashtags": "#Discipleship"
    },
    {
        "ministryType": "service",
        "name": "Cross Cultural",
        "description": "River Cross-Cultural Ministry is God's voice, bringing God's people back to God's agenda. We exist to take part in completing the remaining task of the Great Commission through equipping, edifying and mobilizing churches, both locally and globally.",
        "quote": "Do you have the heart of Jesus for the lost? Do you feel called to missions?",
        "contactName": "Nica Moreno",
        "contactNumber": "09616058244",
        "hashtags": "#CrossCultural #ROGMissions #GreatCommission"
    },
    {
        "ministryType": "body",
        "name": "PCEC Transformation & Revival",
        "subtitle": "Events, activities & testimonies",
        "description": "Links out to a Facebook page for events, activities, and testimonies from the Commission."
    },
    {
        "ministryType": "body",
        "name": "Supernatural Ministry / Prophetic Workshops",
        "subtitle": "Founded 2005 by Pastor Rachel Sanchez",
        "description": "Has its own Vision and Mission statement, with a supporting scripture: Ephesians 2:19–20."
    },
    {
        "ministryType": "body",
        "name": "Soaking in the River",
        "subtitle": "Monthly gathering for the Body of Christ",
        "description": "Focused on prayer for the nation and encountering the Holy Spirit."
    },
    {
        "ministryType": "body",
        "name": "Worship Mentoring",
        "subtitle": "Running since 2014",
        "description": "Equips worship teams — prophetic worship, worship leading, skills training, and song-writing."
    },
    {
        "ministryType": "body",
        "name": "Activate",
        "subtitle": "Annual conference — parent brand of Activate12",
        "description": "Four stated goals around the Holy Spirit, the supernatural, and revival. This year’s conference lives at Activate12."
    },
    {
        "ministryType": "body",
        "name": "Women Arise",
        "subtitle": "Gathering & empowering women",
        "description": "Has its own Vision and Mission statement, focused on gathering and empowering women."
    }
];
function slugify(s) {
    return s
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
async function seedMinistries(strapi) {
    const uid = 'api::ministry.ministry';
    const existing = await strapi.db.query(uid).count();
    if (existing > 0)
        return;
    const used = new Set();
    for (const row of SEED) {
        let slug = slugify(row.name);
        // "River Kids" is both an age group and a serving team — keep slugs unique.
        if (used.has(slug))
            slug = `${slug}-${row.ministryType}`;
        used.add(slug);
        await strapi.documents(uid).create({ data: { ...row, slug }, status: 'published' });
    }
    strapi.log.info(`rog-cms bootstrap: seeded ${SEED.length} ministries from the website's current data`);
}
