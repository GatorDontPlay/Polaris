# To Do List Bug Fixes

## To Do List

### State Management Issues

- [ ] **Mid-Year Reflection Access Control**: The employee cannot view or edit anything in the mid-year reflection until the PDR state = MID_YEAR_OPEN.

### Documentation Updates

- [ ] **Solution Architecture Analysis**: Analyze the `design_doc/solution_architecture.md` file and identify what is out of date compared to the current codebase.
- [ ] **Solution Architecture Update**: Update the `design_doc/solution_architecture.md` file to be inline with the current codebase implementation.

### UI/UX Improvements

- [ ] **Dark Mode Employee Dashboard Optimization**: Review and optimize the dark mode UI for the Employee Dashboard. Current implementation is not readable and looks unprofessional due to poor color selections. Need to redesign with ultra modern, minimalistic, and sleek/cool aesthetic while maintaining the same content structure and functionality.

- [ ] **Company Values UX Analysis & System-wide Implementation**: 
  - Review the company values step UX implementation
  - Document all UX features used and analyze how they enhance user experience in that specific step
  - Conduct comprehensive analysis across the entire project to identify where these UX features can be applied
  - Create detailed plan listing specific areas for UX improvement and implementation strategy
  - Develop roadmap for applying successful UX patterns consistently throughout the entire tool

- [ ] **Stepper Progress Indicator Accuracy**: Review and fix the stepper component to ensure it accurately reflects completion status of each step. Currently showing incorrect progress state - employee has completed values entries but stepper shows step as incomplete. Verify logic for determining step completion and update visual indicators accordingly.

### Data Management

- [ ] **Remove Synthetic Demo Data Dependencies**: 
  - Scan the entire project for any documentation, code, or references to creating synthetic/demo/hardcoded data
  - Remove or refactor any systems that rely on synthetic data generation
  - Ensure all data used in the application is created by actual users through the UI
  - Update any documentation or prompts that suggest creating demo data
  - Implement user-driven data creation workflows where needed

