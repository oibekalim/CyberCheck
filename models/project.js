var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;

var ProjectSchema = Schema(
  {
    student: {type: Schema.Types.ObjectId, ref: 'Student', required: true},
    company_name: {type: String, required: true},
    company_location: {type: String, required: true},
    job_title: {type: String, required: true},
//    Needed to implement with drop-down list enum values    
//    job_type: {type: String, required: true, enum:['contructor','full-time employee']},
    job_type: {type: String, required: true},
    team_size: {type: String, required: true},
    start_date: {type: Date},
    end_date: {type: Date},
  }
);

//Virtual URL for each student

ProjectSchema
.virtual('url')
.get(function(){
  return '/project/'+this.id;
});

ProjectSchema
.virtual('start_work_date')
.get(function () {
  //return moment(this.start_date).format('YYYY-MM-DD');
    return moment(this.start_date).format('MMM YYYY');
});

ProjectSchema
.virtual('end_work_date')
.get(function () {
//  return moment(this.end_date).format('YYYY-MM-DD');
    return moment(this.end_date).format('MMM YYYY');
});

//Export model
module.exports = mongoose.model('Project',ProjectSchema);
