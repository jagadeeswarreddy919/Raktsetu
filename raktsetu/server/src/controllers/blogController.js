const Blog = require('../models/Blog');

exports.createBlog = async (req, res) => {
  try {
    const { title, content, tags, coverImage } = req.body;

    if (!['Admin', 'Super Admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only administrators can create articles.' });
    }

    const blog = await Blog.create({
      title,
      content,
      author: req.user.id,
      tags: tags || [],
      coverImage
    });

    res.status(201).json({ message: 'Article published successfully.', blog });
  } catch (error) {
    res.status(500).json({ message: 'Failed to publish article.', error: error.message });
  }
};

exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate('author', 'fullName email profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving articles.', error: error.message });
  }
};
