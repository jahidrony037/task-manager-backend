const express = require('express');
const router = express.Router();
const Task = require('../models/Task.js');
const Team = require('../models/Team.js');
const Project = require('../models/Project.js');
const ActivityLog = require('../models/ActivityLog.js');
const auth = require('../middleware/auth.js');

// Get all tasks with filters
router.get('/', auth, async (req, res) => {
  try {
    const { project, member } = req.query;
    const filter = { owner: req.userId };

    if (project) filter.project = project;
    if (member) filter['assignedMember.memberId'] = member;

    const tasks = await Task.find(filter)
      .populate('project', 'name team')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
  }
});

// Create task
router.post('/createTask', auth, async (req, res) => {
  try {
    const { title, description, project, assignedMember, priority, status } = req.body;

    const task = new Task({
      title,
      description,
      project,
      assignedMember: assignedMember || { name: 'Unassigned' },
      priority: priority || 'Medium',
      status: status || 'Pending',
      owner: req.userId
    });

    await task.save();

    // Update member's current task count
    if (assignedMember?.memberId) {
      const projectDoc = await Project.findById(project);
      const team = await Team.findById(projectDoc.team);
      const member = team.members.id(assignedMember.memberId);
      if (member) {
        member.currentTasks += 1;
        await team.save();
      }
    }

    await task.populate('project', 'name team');
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create task', error: error.message });
  }
});

// Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.userId })
      .populate('project', 'name team');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch task', error: error.message });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, assignedMember, priority, status } = req.body;
    const task = await Task.findOne({ _id: req.params.id, owner: req.userId });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const oldMemberId = task.assignedMember?.memberId;
    const newMemberId = assignedMember?.memberId;

    // Update task counts if member changed
    if (String(oldMemberId) !== String(newMemberId)) {
      const projectDoc = await Project.findById(task.project);
      const team = await Team.findById(projectDoc.team);

      // Decrease old member's count
      if (oldMemberId) {
        const oldMember = team.members.id(oldMemberId);
        if (oldMember && oldMember.currentTasks > 0) {
          oldMember.currentTasks -= 1;
        }
      }

      // Increase new member's count
      if (newMemberId) {
        const newMember = team.members.id(newMemberId);
        if (newMember) {
          newMember.currentTasks += 1;
        }
      }

      await team.save();
    }

    // Update task
    if (title) task.title = title;
    if (description) task.description = description;
    if (assignedMember) task.assignedMember = assignedMember;
    if (priority) task.priority = priority;
    if (status) task.status = status;

    await task.save();
    await task.populate('project', 'name team');

    res.json({ message: 'Task updated successfully', task });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update task', error: error.message });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.userId });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Decrease member's task count
    if (task.assignedMember?.memberId) {
      const projectDoc = await Project.findById(task.project);
      const team = await Team.findById(projectDoc.team);
      const member = team.members.id(task.assignedMember.memberId);
      if (member && member.currentTasks > 0) {
        member.currentTasks -= 1;
        await team.save();
      }
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete task', error: error.message });
  }
});

// Auto-assign task to member with least load
router.post('/auto-assign/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const projectDoc = await Project.findById(task.project);
    const team = await Team.findById(projectDoc.team);

    // Find member with least load
    let minLoad = Infinity;
    let selectedMember = null;

    team.members.forEach(member => {
      const load = member.currentTasks / member.capacity;
      if (load < minLoad) {
        minLoad = load;
        selectedMember = member;
      }
    });

    if (!selectedMember) {
      return res.status(400).json({ message: 'No available members in team' });
    }

    // Update old member's count if exists
    if (task.assignedMember?.memberId) {
      const oldMember = team.members.id(task.assignedMember.memberId);
      if (oldMember && oldMember.currentTasks > 0) {
        oldMember.currentTasks -= 1;
      }
    }

    // Assign to new member
    task.assignedMember = {
      memberId: selectedMember._id,
      name: selectedMember.name
    };

    selectedMember.currentTasks += 1;
    await team.save();
    await task.save();
    await task.populate('project', 'name team');

    res.json({ message: 'Task auto-assigned successfully', task });
  } catch (error) {
    res.status(500).json({ message: 'Auto-assign failed', error: error.message });
  }
});

module.exports = router;