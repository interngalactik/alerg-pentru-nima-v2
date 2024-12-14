'use client'

export default function Calendar() {
  return (
    <section className="section">
      <div className="container centered">
        <div className="_60_spacer"></div>
        <h2 className="heading">Calendar competiții</h2>
        <div className="_15-spacer"></div>
        <div className="table_section">
          <a href="#" className="paragraph table_year">&lt; 2024</a>
          <div className="_15-spacer"></div>
          <div className="table_wrapper">
            {/* Table content will be populated from Google Sheets */}
          </div>
        </div>
        <div className="_60_spacer"></div>
      </div>
    </section>
  )
}