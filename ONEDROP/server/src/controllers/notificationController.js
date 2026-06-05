const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('donor', 'fullName phone bloodGroup profileImage')
      .populate('bloodRequest', 'patientName hospitalName bloodGroup unitsRequired emergencyMode city state')
      .sort({ createdAt: -1 });
    
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving notifications.', error: error.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or access denied.' });
    }

    res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification status.', error: error.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications.', error: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const result = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
    if (!result) {
      return res.status(404).json({ message: 'Notification not found or access denied.' });
    }
    res.status(200).json({ message: 'Notification deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification.', error: error.message });
  }
};
