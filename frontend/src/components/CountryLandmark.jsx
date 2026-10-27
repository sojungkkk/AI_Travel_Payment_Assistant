const labels = {
  FR: '프랑스 · 에펠탑',
  JP: '일본 · 도쿄 타워',
  TH: '태국 · 왓 아룬',
};

export default function CountryLandmark({ countryCode }) {
  const label = labels[countryCode];
  if (!label) return null;

  return <div className="landmark-art" role="img" aria-label={label} data-country={countryCode}>
    <svg viewBox="0 0 420 310" aria-hidden="true" focusable="false">
      <circle cx="232" cy="125" r="98" fill="#b9e8ff" />
      <circle cx="232" cy="125" r="117" fill="none" stroke="#ffffff20" />
      <path d="M0 274h420M28 285h350" fill="none" stroke="#81c5eb" />

      {countryCode === 'FR' && <>
        <g stroke="#81c5eb" fill="none">
          <path d="M18 227h385M30 274V193h55v81m-45-81v-22h34v22m260 81v-92h48v92m-37-92v-20h25v20" />
          <path d="M30 204h55m-55 15h55m-55 16h55m249-39h48m-48 15h48m-48 15h48" />
        </g>
        <g fill="none" stroke="#effaff" strokeLinejoin="round">
          <path d="M214 40l-17 116-48 118m65-234l17 116 48 118M190 165h49m-63 40h80m-93 45h105M196 154h37M204 112h21M214 27v17" strokeWidth="5" />
          <path d="M185 274q28-74 58 0M197 156l43 49m-9-49l-43 49m-12 0l77 45m3-45l-78 45" strokeWidth="2.5" />
        </g>
        <g fill="#85caef">
          <path d="M21 274v-34q-22-40 0-49 23 9 0 49m372 34v-34q-22-40 0-49 23 9 0 49" />
        </g>
      </>}

      {countryCode === 'JP' && <>
        <g fill="none" stroke="#81c5eb" strokeWidth="1.5">
          <path d="M35 274V206h38v68m8 0v-91h44v91m191 0v-71h34v71m9 0V187h32v87M85 197h36m201 25h22" />
          <path d="M43 218h22m-22 14h22m25-21h23m-23 14h23m252-23h18m-18 14h18" />
        </g>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M222 24v41M222 65l-58 209m58-209l58 209" stroke="#ffc1b0" strokeWidth="6" />
          <path d="M222 33v15M213 95h18M205 126h34M196 159h52M184 202h76M173 244h98" stroke="#fff5ee" strokeWidth="6" />
          <path d="M210 108l23 24-30 28 43 36-60 43 81 35M234 108l-23 24 30 28-43 36 60 43-81 35" stroke="#fff5ee" strokeWidth="2" />
        </g>
        <path d="M200 125h44l5 17h-54z" fill="#fff5ee" stroke="#ffc1b0" strokeWidth="3" />
        <path d="M187 185h70l7 20h-84z" fill="#fff5ee" stroke="#ffc1b0" strokeWidth="3" />
        <path d="M204 131h36M196 193h52M212 130v9m10-9v9m10-9v9m-25 50v11m15-11v11m15-11v11" stroke="#247cac" strokeWidth="2" />
        <path d="M151 274h142" stroke="#fff5ee" strokeWidth="5" />
      </>}

      {countryCode === 'TH' && <>
        <g fill="#bce6f9" stroke="#effaff" strokeWidth="2" strokeLinejoin="round">
          {[128, 316].map(x => <g key={x} transform={`translate(${x} 177)`}>
            <path d="M0-43l-5 24h-5l4 10-10 17 5 7-13 27 5 9-9 27h56l-9-27 5-9-13-27 5-7L6-9l4-10H5z" />
            <path d="M-16 29h32m-21 22h42M0-52v12" fill="none" stroke="#f7dcaa" strokeWidth="3" />
            <path d="M-5 78V60q5-9 10 0v18" fill="#277daf" />
          </g>)}
          <path d="M222 42l-8 38h-8l4 11-11 14 6 6-14 23 7 10-15 29 8 12-18 35 8 9-12 29h106l-12-29 8-9-18-35 8-12-15-29 7-10-14-23 6-6-11-14 4-11h-8z" />
        </g>
        <g fill="none" stroke="#f7dcaa" strokeWidth="4" strokeLinejoin="round">
          <path d="M222 25v24M207 99h30m-38 23h46m-50 27h54m-62 29h70m-80 38h90M167 244h110" />
          <path d="M154 258h136v16H154zM141 274h162v9H141z" />
        </g>
        <g fill="#277daf">
          <path d="M211 258v-26q11-19 22 0v26z" />
          <path d="M213 192v-13q9-13 18 0v13zm2-45v-10q7-11 14 0v10z" />
        </g>
        <path d="M33 290q24-6 48 0t48 0m166 0q24-6 48 0t48 0" fill="none" stroke="#85caef" strokeWidth="2" />
      </>}

      <path d="M79 88l8-19 8 19 19 8-19 8-8 19-8-19-19-8z" fill="#c6ebff" />
      <path d="M332 64l4-10 4 10 10 4-10 4-4 10-4-10-10-4z" fill="#c6ebff" />
    </svg>
    <span aria-hidden="true">{label}</span>
  </div>;
}
