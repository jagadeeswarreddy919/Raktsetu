const GalleryItem = require('../models/GalleryItem');

// Default Gallery Items to seed if collection is empty
const DEFAULT_ITEMS = [
  {
    title: "Donation Camp Ahmedabad",
    category: "drives",
    desc: "Over 250 units collected at our state-level corporate donation camp.",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=600&auto=format&fit=crop"
  },
  {
    title: "Clinical Screening Setup",
    category: "clinical",
    desc: "Verified rapid serology testing for donor health security checks.",
    image: "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?q=80&w=600&auto=format&fit=crop"
  },
  {
    title: "Gift of Life Quote",
    category: "quotes",
    desc: "Your blood is a priceless gift. Share it to save up to three lives.",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop"
  },
  {
    title: "Verified Proximity Logistics",
    category: "clinical",
    desc: "Certified insulated cold-storage bags ready for transport.",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600&auto=format&fit=crop"
  },
  {
    title: "Lifesaver Youth Drive",
    category: "drives",
    desc: "Students of Kadapa Engineering College showing off rewards.",
    image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=600&auto=format&fit=crop"
  },
  {
    title: "Be a Hero Quote",
    category: "quotes",
    desc: "Heroes don't always wear capes. Some roll up their sleeves.",
    image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=600&auto=format&fit=crop"
  }
];

exports.getGalleryItems = async (req, res) => {
  try {
    let items = await GalleryItem.find().sort({ createdAt: -1 });
    
    // Seed default items if collection is empty
    if (items.length === 0) {
      await GalleryItem.insertMany(DEFAULT_ITEMS);
      items = await GalleryItem.find().sort({ createdAt: -1 });
    }
    
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving gallery items.', error: error.message });
  }
};

exports.createGalleryItem = async (req, res) => {
  try {
    const { title, category, desc, image } = req.body;

    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only administrators can add gallery items.' });
    }

    if (!title || !category || !desc || !image) {
      return res.status(400).json({ message: 'All fields (title, category, desc, image) are required.' });
    }

    const item = await GalleryItem.create({
      title,
      category,
      desc,
      image
    });

    res.status(201).json({ message: 'Gallery item added successfully.', item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add gallery item.', error: error.message });
  }
};

exports.deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only administrators can remove gallery items.' });
    }

    const item = await GalleryItem.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ message: 'Gallery item not found.' });
    }

    res.status(200).json({ message: 'Gallery item removed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove gallery item.', error: error.message });
  }
};
