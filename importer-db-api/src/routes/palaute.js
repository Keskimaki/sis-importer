const { Op } = require('sequelize')
const express = require('express')
const models = require('../models')

const relevantAttributes = {
  enrolment: ['id', 'personId', 'assessmentItemId', 'courseUnitRealisationId', 'courseUnitId', 'studySubGroups'],
  courseUnit: ['id', 'groupId', 'code', 'organisations', 'completionMethods', 'responsibilityInfos', 'name'],
  courseUnitRealisation: ['id', 'name', 'nameSpecifier', 'assessmentItemIds', 'activityPeriod', 'courseUnitRealisationTypeUrn', 'studyGroupSets', 'organisations', 'responsibilityInfos'],
  assessmentItem: ['id', 'name', 'nameSpecifier', 'assessmentItemType', 'organisations', 'primaryCourseUnitGroupId'],
}

const router = express.Router()

router.get('/enrolled/:personId', async (req, res) => {
  const {
    params: { personId },
    query: { startDateBefore, endDateAfter },
  } = req

  const scopes = [
    startDateBefore && { method: ['activityPeriodStartDateBefore', new Date(startDateBefore)] },
    endDateAfter && { method: ['activityPeriodEndDateAfter', new Date(endDateAfter)] },
  ].filter(Boolean)

  const enrolments = await models.Enrolment.findAll({
    where: {
      personId,
    },
    attributes: relevantAttributes.enrolment,
    include: [
      {
        model: models.CourseUnitRealisation.scope(scopes),
        attributes: relevantAttributes.courseUnitRealisation,
        as: 'courseUnitRealisation',
      },
      {
        model: models.AssessmentItem,
        attributes: relevantAttributes.assessmentItem,
        as: 'assessmentItem',
        include: [
          {
            model: models.CourseUnit,
            attributes: relevantAttributes.courseUnit,
            as: 'courseUnit',
          },
        ],
      },
      {
        model: models.CourseUnit,
        attributes: relevantAttributes.courseUnit,
        as: 'courseUnit',
      },
    ],
  })

  res.send(enrolments)
})

router.get('/responsible/:personId', async (req, res) => {
  const {
    params: { personId },
  } = req

  const courseUnitRealisations = await models.CourseUnitRealisation.findAll({
    attributes: relevantAttributes.courseUnitRealisation,
    where: {
      responsibilityInfos: {
        [Op.contains]: [
          {
            personId: personId,
          },
        ],
      },
    },
  })

  const courseUnits = await models.CourseUnit.findAll({
    attributes: relevantAttributes.courseUnit,
    where: {
      responsibilityInfos: {
        [Op.contains]: [
          {
            personId: personId,
          },
        ],
      },
    },
  })

  const assessmentItemIds = [].concat(...courseUnitRealisations.map(c => c.assessmentItemIds))

  const assessmentItems = await models.AssessmentItem.findAll({
    attributes: relevantAttributes.assessmentItem,
    where: {
      id: {
        [Op.in]: assessmentItemIds,
      },
    },
    include: [{ model: models.CourseUnit, attributes: relevantAttributes.courseUnit, 
      as: 'courseUnit' }],
  })

  res.send({
    courseUnitRealisations,
    courseUnits,
    assessmentItems,
  })
})

module.exports = router
