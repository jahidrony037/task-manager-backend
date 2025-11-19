const express = require('express');
const router = express.Router();
const Project = require('../models/Project.js');
const auth = require('../middleware/auth.js');

// Get all projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.userId })
      .populate('team', 'name members');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
  }
});

// Create project
router.post('/createProject', auth, async (req, res) => {
  try {
    const { name, description, team } = req.body;
    console.log(req.userId);
    const project = new Project({
      name,
      description,
      team,
      owner: req.userId
    });

    await project.save();
    await project.populate('team', 'name members');

    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId })
      .populate('team', 'name members');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project', error: error.message });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, team } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { name, description, team },
      { new: true, runValidators: true }
    ).populate('team', 'name members');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ message: 'Project updated successfully', project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update project', error: error.message });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete project', error: error.message });
  }
});

module.exports = router;