const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const Team = require('../models/Team');
const ActivityLog = require('../models/ActivityLog');
const auth = require('../middleware/auth');

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments({ owner: req.userId });
    const totalTasks = await Task.countDocuments({ owner: req.userId });
    
    const teams = await Team.find({ owner: req.userId });
    const recentLogs = await ActivityLog.find({ owner: req.userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate team summary
    const teamSummary = teams.map(team => ({
      teamId: team._id,
      teamName: team.name,
      members: team.members.map(member => ({
        memberId: member._id,
        name: member.name,
        role: member.role,
        currentTasks: member.currentTasks,
        capacity: member.capacity,
        isOverloaded: member.currentTasks > member.capacity
      }))
    }));

    res.json({
      totalProjects,
      totalTasks,
      teamSummary,
      recentLogs
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
});

// Reassign tasks automatically
router.post('/reassign-tasks', auth, async (req, res) => {
  try {
    const teams = await Team.find({ owner: req.userId });
    const projects = await Project.find({ owner: req.userId });
    const reassignedTasks = [];

    for (const project of projects) {
      const team = teams.find(t => String(t._id) === String(project.team));
      if (!team) continue;

      // Find overloaded members
      const overloadedMembers = team.members.filter(m => m.currentTasks > m.capacity);
      
      for (const overloadedMember of overloadedMembers) {
        // Get tasks of overloaded member (Low and Medium priority only)
        const tasks = await Task.find({
          owner: req.userId,
          project: project._id,
          'assignedMember.memberId': overloadedMember._id,
          priority: { $in: ['Low', 'Medium'] }
        }).sort({ priority: 1 }); // Low priority first

        const tasksToMove = tasks.slice(0, overloadedMember.currentTasks - overloadedMember.capacity);

        for (const task of tasksToMove) {
          // Find member with available capacity
          const availableMembers = team.members.filter(m => 
            m.currentTasks < m.capacity && 
            String(m._id) !== String(overloadedMember._id)
          ).sort((a, b) => a.currentTasks - b.currentTasks);

          if (availableMembers.length > 0) {
            const targetMember = availableMembers[0];

            // Update task
            const oldMemberName = task.assignedMember.name;
            task.assignedMember = {
              memberId: targetMember._id,
              name: targetMember.name
            };
            await task.save();

            // Update team member counts
            overloadedMember.currentTasks -= 1;
            targetMember.currentTasks += 1;

            // Log activity
            const log = new ActivityLog({
              task: task._id,
              taskTitle: task.title,
              fromMember: { name: oldMemberName },
              toMember: { name: targetMember.name },
              owner: req.userId
            });
            await log.save();

            reassignedTasks.push({
              taskId: task._id,
              taskTitle: task.title,
              from: oldMemberName,
              to: targetMember.name
            });
          }
        }
      }

      await team.save();
    }

    res.json({
      message: `Successfully reassigned ${reassignedTasks.length} tasks`,
      reassignedTasks
    });
  } catch (error) {
    res.status(500).json({ message: 'Task reassignment failed', error: error.message });
  }
});

// Get activity logs
router.get('/activity-logs', auth, async (req, res) => {
  try {
    const logs = await ActivityLog.find({ owner: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch activity logs', error: error.message });
  }
});

module.exports = router;