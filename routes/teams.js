const express = require('express');
const router = express.Router();
const Team = require('../models/Team.js');
const auth = require('../middleware/auth.js');

// Get all teams for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const teams = await Team.find({ owner: req.userId });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch teams', error: error.message });
  }
});

// Create team
router.post('/createTeam', auth, async (req, res) => {
  try {
    const { name, description, members } = req.body;
    // console.log(req.body);

    const team = new Team({
      name,
      description,
      owner: req.userId,
      members: members || []
    });

    await team.save();
    res.status(201).json({ message: 'Team created successfully', team });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create team', error: error.message });
  }
});

// Get single team
router.get('/singleTeam/:id', auth, async (req, res) => {
  try {
    const team = await Team.findOne({ _id: req.params.id, owner: req.userId });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch team', error: error.message });
  }
});

// Update team
router.put('/updateTeam/:id', auth, async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const team = await Team.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { name, description, members },
      { new: true, runValidators: true }
    );

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({ message: 'Team updated successfully', team });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update team', error: error.message });
  }
});

// Delete team
router.delete('/deleteTeam/:id', auth, async (req, res) => {
  try {
    const team = await Team.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete team', error: error.message });
  }
});

// Add member to team
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { name, role, capacity } = req.body;
    const team = await Team.findOne({ _id: req.params.id, owner: req.userId });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    team.members.push({ name, role, capacity: capacity || 3, currentTasks: 0 });
    await team.save();

    res.json({ message: 'Member added successfully', team });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add member', error: error.message });
  }
});

// Update team member
router.put('/:teamId/members/:memberId', auth, async (req, res) => {
  try {
    const { name, role, capacity } = req.body;
    const team = await Team.findOne({ _id: req.params.teamId, owner: req.userId });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const member = team.members.id(req.params.memberId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (name) member.name = name;
    if (role) member.role = role;
    if (capacity !== undefined) member.capacity = capacity;

    await team.save();
    res.json({ message: 'Member updated successfully', team });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update member', error: error.message });
  }
});

// Delete team member
router.delete('/:teamId/members/:memberId', auth, async (req, res) => {
  try {
    const team = await Team.findOne({ _id: req.params.teamId, owner: req.userId });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    team.members.pull(req.params.memberId);
    await team.save();

    res.json({ message: 'Member removed successfully', team });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove member', error: error.message });
  }
});

module.exports = router;