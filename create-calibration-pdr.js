// Script to create a PDR with CALIBRATION status for testing
const createCalibrationPDR = () => {
  const now = new Date();
  const pdrId = `demo-pdr-${now.getTime()}`;
  
  // Create a PDR with CALIBRATION status
  const pdr = {
    id: pdrId,
    employeeId: 'demo-employee',
    status: 'CALIBRATION',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    financialYear: '2023-2024',
    title: 'Annual Performance Review',
    description: 'Annual performance and development review',
    meetingBooked: false
  };
  
  // Create some goals with ratings
  const goals = [
    {
      id: `goal-1-${pdrId}`,
      pdrId: pdrId,
      title: 'Complete Project X',
      description: 'Successfully deliver Project X on time and within budget',
      employeeRating: 4,
      ceoRating: 4,
      employeeFinalComments: 'Completed the project ahead of schedule',
      employeeFinalRating: 4
    },
    {
      id: `goal-2-${pdrId}`,
      pdrId: pdrId,
      title: 'Improve Code Quality',
      description: 'Reduce bugs by 20% through improved testing',
      employeeRating: 5,
      ceoRating: 4,
      employeeFinalComments: 'Implemented comprehensive test suite',
      employeeFinalRating: 5
    }
  ];
  
  // Create some behaviors with ratings
  const behaviors = [
    {
      id: `behavior-1-${pdrId}`,
      pdrId: pdrId,
      valueId: 'lean-thinking',
      title: 'Lean Thinking',
      description: 'Apply lean principles to work',
      employeeRating: 4,
      ceoRating: 3,
      employeeFinalComments: 'Implemented several process improvements',
      employeeFinalRating: 4
    },
    {
      id: `behavior-2-${pdrId}`,
      pdrId: pdrId,
      valueId: 'craftsmanship',
      title: 'Craftsmanship',
      description: 'Demonstrate attention to detail and quality',
      employeeRating: 5,
      ceoRating: 5,
      employeeFinalComments: 'Consistently delivered high-quality work',
      employeeFinalRating: 5
    }
  ];
  
  // Store in localStorage
  localStorage.setItem(`demo_pdr_${pdrId}`, JSON.stringify(pdr));
  localStorage.setItem(`demo_goals_${pdrId}`, JSON.stringify(goals));
  localStorage.setItem(`demo_behaviors_${pdrId}`, JSON.stringify(behaviors));
  localStorage.setItem('demo_current_pdr', JSON.stringify(pdr));
  
  console.log(`Created PDR with ID: ${pdrId} and status: CALIBRATION`);
  console.log('PDR data:', pdr);
  
  // Also update the demo user to include this PDR
  try {
    const demoUserString = localStorage.getItem('demo_user');
    if (demoUserString) {
      const demoUser = JSON.parse(demoUserString);
      demoUser.currentPdrId = pdrId;
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      console.log('Updated demo user with new PDR ID');
    } else {
      console.log('No demo user found in localStorage');
      // Create a demo user
      const demoUser = {
        id: 'demo-user',
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com',
        role: 'EMPLOYEE',
        currentPdrId: pdrId
      };
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      console.log('Created new demo user with PDR ID');
    }
  } catch (error) {
    console.error('Error updating demo user:', error);
  }
  
  return pdrId;
};

// Execute when loaded
const pdrId = createCalibrationPDR();
console.log(`Use this PDR ID for testing: ${pdrId}`);