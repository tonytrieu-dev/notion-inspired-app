import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { calculateFullGPA, calculateWhatIfScenario } from '../services/grade/gpaService';
import { getClassWithGrades } from '../services/grade/gradeOperations';
import type { 
  GPACalculation, 
  ClassWithGrades, 
  WhatIfScenario, 
  GradeChange 
} from '../types/database';

interface GradeDashboardProps {
  onSwitchToGradeEntry?: () => void;
}

const GradeDashboard: React.FC<GradeDashboardProps> = ({ onSwitchToGradeEntry }) => {
  const { user, isAuthenticated } = useAuth();
  const [gpaData, setGpaData] = useState<GPACalculation | null>(null);
  const [classesWithGrades, setClassesWithGrades] = useState<ClassWithGrades[]>([]);
  const [whatIfScenario, setWhatIfScenario] = useState<WhatIfScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Load GPA data
  const loadGpaData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const gpaCalc = await calculateFullGPA(user.id, isAuthenticated);
      setGpaData(gpaCalc);

      // Load detailed class information
      const classesData: ClassWithGrades[] = [];
      for (const classGrade of gpaCalc.classGrades) {
        const classWithGrades = await getClassWithGrades(classGrade.classId, user.id, isAuthenticated);
        if (classWithGrades) {
          classesData.push(classWithGrades);
        }
      }
      setClassesWithGrades(classesData);
    } catch (error) {
      console.error('Error loading GPA data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAuthenticated]);

  useEffect(() => {
    loadGpaData();
  }, [loadGpaData]);

  // Handle what-if scenario calculation
  const handleWhatIfChange = useCallback(async (classId: string, assignmentId: string, newGrade: number) => {
    if (!user?.id) return;

    const classData = classesWithGrades.find(c => c.id === classId);
    const assignment = classData?.assignments.find(a => a.id === assignmentId);
    
    if (!assignment) return;

    const change: GradeChange = {
      assignmentId,
      assignmentName: assignment.name,
      className: classData!.name,
      currentGrade: assignment.grade?.points_earned,
      newGrade,
      pointsEarned: (newGrade / 100) * assignment.points_possible,
      pointsPossible: assignment.points_possible
    };

    try {
      const scenario = await calculateWhatIfScenario(user.id, [change], isAuthenticated);
      setWhatIfScenario(scenario);
    } catch (error) {
      console.error('Error calculating what-if scenario:', error);
    }
  }, [user?.id, isAuthenticated, classesWithGrades]);

  const resetWhatIf = useCallback(() => {
    setWhatIfScenario(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!gpaData) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Grades Yet</h3>
        <p className="text-gray-600 mb-6">Start tracking your grades to see your GPA and analytics.</p>
        <button
          onClick={onSwitchToGradeEntry}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Add Your First Grade
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* GPA Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Grade Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {whatIfScenario ? whatIfScenario.resultingGPA : gpaData.currentGPA}
            </div>
            <div className="text-sm text-gray-600">Current GPA</div>
            {whatIfScenario && (
              <div className={`text-sm font-medium ${
                whatIfScenario.gpaChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {whatIfScenario.gpaChange >= 0 ? '+' : ''}{whatIfScenario.gpaChange} change
              </div>
            )}
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{gpaData.semesterGPA}</div>
            <div className="text-sm text-gray-600">Semester GPA</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{gpaData.totalCreditHours}</div>
            <div className="text-sm text-gray-600">Credit Hours</div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{gpaData.classGrades.length}</div>
            <div className="text-sm text-gray-600">Classes</div>
          </div>
        </div>

        {whatIfScenario && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-yellow-800">What-If Scenario Active</h3>
                <p className="text-sm text-yellow-700">
                  Showing projected GPA with your changes. 
                  GPA would {whatIfScenario.gpaChange >= 0 ? 'increase' : 'decrease'} by {Math.abs(whatIfScenario.gpaChange)} points.
                </p>
              </div>
              <button
                onClick={resetWhatIf}
                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Class Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Class Performance</h3>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(e.target.value || null)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="">All Classes</option>
            {gpaData.classGrades.map(classGrade => (
              <option key={classGrade.classId} value={classGrade.classId}>
                {classGrade.className}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {gpaData.classGrades
            .filter(classGrade => !selectedClass || classGrade.classId === selectedClass)
            .map(classGrade => {
              const classData = classesWithGrades.find(c => c.id === classGrade.classId);
              
              return (
                <div key={classGrade.classId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{classGrade.className}</h4>
                      <p className="text-sm text-gray-600">
                        {classGrade.creditHours} credit hours • {classGrade.isCompleted ? 'Completed' : 'In Progress'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{classGrade.currentGrade.toFixed(1)}%</div>
                      <div className={`text-sm font-medium px-2 py-1 rounded ${
                        classGrade.letterGrade === 'A' || classGrade.letterGrade === 'A+' || classGrade.letterGrade === 'A-' 
                          ? 'bg-green-100 text-green-800' :
                        classGrade.letterGrade.startsWith('B') 
                          ? 'bg-blue-100 text-blue-800' :
                        classGrade.letterGrade.startsWith('C') 
                          ? 'bg-yellow-100 text-yellow-800' :
                        classGrade.letterGrade.startsWith('D') 
                          ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                        {classGrade.letterGrade}
                      </div>
                    </div>
                  </div>

                  {/* Grade Categories */}
                  {classData && (
                    <div className="space-y-2">
                      {classData.categories.map(category => {
                        const categoryAssignments = classData.assignments
                          .filter(a => a.category_id === category.id && a.grade);
                        
                        if (categoryAssignments.length === 0) return null;

                        const totalPoints = categoryAssignments.reduce((sum, a) => sum + a.points_possible, 0);
                        const earnedPoints = categoryAssignments.reduce((sum, a) => sum + (a.grade?.points_earned || 0), 0);
                        const categoryPercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

                        return (
                          <div key={category.id} className="flex justify-between items-center py-2 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: category.color || '#6b7280' }}
                              />
                              <span className="text-sm font-medium">{category.name}</span>
                              <span className="text-xs text-gray-500">({category.weight}%)</span>
                            </div>
                            <div className="text-sm font-medium">
                              {categoryPercentage.toFixed(1)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Recent Assignments with What-If Controls */}
                  {classData && classData.assignments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Recent Assignments</h5>
                      <div className="space-y-2">
                        {classData.assignments
                          .slice(0, 3)
                          .map(assignment => (
                            <div key={assignment.id} className="flex justify-between items-center py-1">
                              <div className="flex-1">
                                <span className="text-sm text-gray-900">{assignment.name}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  ({assignment.points_possible} pts)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {assignment.grade ? (
                                  <>
                                    <span className="text-sm font-medium">
                                      {assignment.grade.points_earned}/{assignment.points_possible}
                                    </span>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={assignment.grade.percentage || 0}
                                      onChange={(e) => handleWhatIfChange(
                                        classData.id, 
                                        assignment.id, 
                                        Number(e.target.value)
                                      )}
                                      className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                      title="Drag to see what-if scenario"
                                    />
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-400">Not graded</span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={onSwitchToGradeEntry}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="bg-blue-100 p-2 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium">Add Grade</div>
              <div className="text-sm text-gray-600">Enter a new assignment grade</div>
            </div>
          </button>

          <button
            onClick={() => {/* TODO: Implement grade import */}}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="bg-green-100 p-2 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium">Import Grades</div>
              <div className="text-sm text-gray-600">Upload from CSV or gradebook</div>
            </div>
          </button>

          <button
            onClick={() => {/* TODO: Implement analytics view */}}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="bg-purple-100 p-2 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium">View Analytics</div>
              <div className="text-sm text-gray-600">Detailed grade trends</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradeDashboard;